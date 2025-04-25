using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.IO;
using System.IO.Pipes;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using System.Drawing; // Added for Size

namespace TauriWebView2Download
{
    public class MainForm : Form
    {
        private TabControl tabControl;
        private string customUserDataFolder;
        private static readonly string PipeName = "TauriWebView2DownloadPipe";
        private NamedPipeServerStream pipeServer;
        private bool isClosing;

        public MainForm(string initialMessage)
        {
            InitializeForm();
            StartPipeServer();
            if (!string.IsNullOrEmpty(initialMessage))
            {
                _ = ProcessInitialMessage(initialMessage); // Fire-and-forget async call
            }
        }

        private void InitializeForm()
        {
            // Set form properties
            this.Text = "WebView2 Download Manager";
            this.Size = new Size(800, 600); // Fixed: Using System.Drawing.Size
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormClosing += MainForm_FormClosing;

            // Initialize TabControl
            tabControl = new TabControl
            {
                Dock = DockStyle.Fill
            };
            this.Controls.Add(tabControl);
        }

        private async Task ProcessInitialMessage(string message)
        {
            try
            {
                dynamic data = JsonConvert.DeserializeObject(message);
                await AddNewDownloadTab(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to parse initial message: {ex.Message}");
                PostMessage(new { status = "error", message = $"Failed to parse initial message: {ex.Message}" });
            }
        }

        private async Task AddNewDownloadTab(dynamic data)
        {
            string downloadUrl = data.url?.ToString();
            string saveFolder = data.saveFolder?.ToString();
            string downloadId = data.downloadId?.ToString();
            string filename = data.filename?.ToString();

            if (string.IsNullOrEmpty(downloadUrl) || !Uri.IsWellFormedUriString(downloadUrl, UriKind.Absolute))
            {
                PostMessage(new { status = "error", message = "Invalid or missing URL", downloadId });
                return;
            }

            if (string.IsNullOrEmpty(saveFolder) || !IsValidPath(saveFolder))
            {
                PostMessage(new { status = "error", message = "Invalid or missing save folder path", downloadId });
                return;
            }

            if (string.IsNullOrEmpty(downloadId))
            {
                PostMessage(new { status = "error", message = "Missing download ID" });
                return;
            }

            // Create a new tab
            TabPage tabPage = new TabPage($"Download {tabControl.TabPages.Count + 1}");
            WebView2 webView = new WebView2 { Dock = DockStyle.Fill };
            tabPage.Controls.Add(webView);
            tabControl.TabPages.Add(tabPage);
            tabControl.SelectedTab = tabPage;

            // Initialize WebView2
            string userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                $"TauriWebView2Download_{Guid.NewGuid()}" // Unique folder per tab
            );
            Console.WriteLine($"Creating WebView2 user data folder: {userDataFolder}");
            Directory.CreateDirectory(userDataFolder);

            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
            await webView.EnsureCoreWebView2Async(environment);
            Console.WriteLine($"WebView2 initialized for downloadId: {downloadId}");

            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            // Attach download event
            webView.CoreWebView2.DownloadStarting += (sender, e) =>
                CoreWebView2_DownloadStarting(sender, e, saveFolder, downloadId, filename, webView, tabPage);

            // Navigate to download URL
            webView.CoreWebView2.Navigate(downloadUrl);
            Console.WriteLine($"Navigating to: {downloadUrl}");
            PostMessage(new { status = "success", message = $"Navigating to: {downloadUrl} with save folder: {saveFolder}", downloadId });
        }

        private void CoreWebView2_DownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e,
            string saveFolder, string downloadId, string filename, WebView2 webView, TabPage tabPage)
        {
            try
            {
                Console.WriteLine($"Download starting for URI: {e.DownloadOperation.Uri}");
                if (string.IsNullOrEmpty(saveFolder))
                {
                    PostMessage(new { status = "error", message = "Save folder not specified", downloadId });
                    return;
                }

                string normalizedSaveFolder = saveFolder;
                if (normalizedSaveFolder.StartsWith(@"\\?\"))
                {
                    normalizedSaveFolder = normalizedSaveFolder.Substring(4);
                }

                if (!Directory.Exists(normalizedSaveFolder))
                {
                    Console.WriteLine($"Creating save folder: {normalizedSaveFolder}");
                    Directory.CreateDirectory(normalizedSaveFolder);
                }

                string suggestedFileName = e.ResultFilePath;
                if (string.IsNullOrEmpty(Path.GetFileName(suggestedFileName)))
                {
                    suggestedFileName = !string.IsNullOrEmpty(filename) ? filename :
                        Path.GetFileName(e.DownloadOperation.Uri) ?? "download";
                }

                string fullPath = Path.Combine(normalizedSaveFolder, suggestedFileName);
                e.ResultFilePath = fullPath;
                e.Handled = true;

                Console.WriteLine($"Downloading to: {fullPath}");
                PostMessage(new { status = "success", message = $"Downloading to: {fullPath}", downloadId });

                e.DownloadOperation.StateChanged += (s, args) =>
                {
                    try
                    {
                        if (e.DownloadOperation.State == CoreWebView2DownloadState.Completed)
                        {
                            Console.WriteLine($"Download completed: {fullPath}");
                            PostMessage(new { status = "success", message = $"Download completed: {fullPath}", downloadId, path = fullPath });
                            this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                        }
                        else if (e.DownloadOperation.State == CoreWebView2DownloadState.Interrupted)
                        {
                            Console.WriteLine($"Download interrupted: {e.DownloadOperation.InterruptReason}");
                            PostMessage(new { status = "error", message = $"Download interrupted: {e.DownloadOperation.InterruptReason}", downloadId });
                            this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Download state error: {ex.Message}");
                        PostMessage(new { status = "error", message = $"Download state error: {ex.Message}", downloadId });
                        this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                    }
                };

                e.DownloadOperation.BytesReceivedChanged += (s, args) =>
                {
                    try
                    {
                        double bytesReceived = e.DownloadOperation.BytesReceived;
                        double totalBytes = e.DownloadOperation.TotalBytesToReceive ?? bytesReceived;
                        float progress = totalBytes > 0 ? (float)(bytesReceived / totalBytes * 100) : 0;
                        Console.WriteLine($"Download progress: {progress}%");
                        PostMessage(new { status = "progress", message = $"Progress: {progress}%", downloadId, progress });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Progress update error: {ex.Message}");
                        PostMessage(new { status = "error", message = $"Progress update error: {ex.Message}", downloadId });
                    }
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Download failed: {ex.Message}");
                PostMessage(new { status = "error", message = $"Download failed: {ex.Message}", downloadId });
            }
        }

        private void RemoveTab(TabPage tabPage, WebView2 webView)
        {
            if (!isClosing)
            {
                tabControl.TabPages.Remove(tabPage);
                webView.Dispose();
                if (tabControl.TabPages.Count == 0)
                {
                    this.Close();
                }
            }
        }

        private void PostMessage(object message)
        {
            try
            {
                string json = JsonConvert.SerializeObject(message);
                Console.WriteLine($"Sending to stdout: {json}");
                Console.Error.WriteLine(json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error serializing message: {ex.Message}");
                Console.Error.WriteLine(JsonConvert.SerializeObject(new
                {
                    status = "error",
                    message = $"Error serializing message: {ex.Message}"
                }));
            }
        }

        private bool IsValidPath(string path)
        {
            try
            {
                string normalizedPath = path;
                if (normalizedPath.StartsWith(@"\\?\"))
                {
                    normalizedPath = normalizedPath.Substring(4);
                }
                Path.GetFullPath(normalizedPath);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private void StartPipeServer()
        {
            Task.Run(async () =>
            {
                while (!isClosing)
                {
                    try
                    {
                        using (pipeServer = new NamedPipeServerStream(PipeName, PipeDirection.In))
                        {
                            await pipeServer.WaitForConnectionAsync();
                            using (StreamReader reader = new StreamReader(pipeServer))
                            {
                                string message = await reader.ReadToEndAsync();
                                if (!string.IsNullOrEmpty(message))
                                {
                                    this.Invoke((Action)(async () => await ProcessInitialMessage(message)));
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Pipe server error: {ex.Message}");
                    }
                }
            });
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            isClosing = true;
            if (pipeServer != null)
            {
                try
                {
                    pipeServer.Dispose();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error disposing pipe server: {ex.Message}");
                }
            }

            foreach (TabPage tab in tabControl.TabPages)
            {
                foreach (Control control in tab.Controls)
                {
                    if (control is WebView2 webpex)
                    {
                        webpex.Dispose(); // Fixed: Corrected variable name from webView to webpex
                    }
                }
            }
            tabControl.Dispose();
        }

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Console.WriteLine($"Command-line args: {string.Join(", ", args)}");
            string messageJson = args.Length > 0 ? args[0] : null;

            // Try to connect to existing instance
            try
            {
                using (var pipeClient = new NamedPipeClientStream(".", PipeName, PipeDirection.Out))
                {
                    pipeClient.Connect(1000); // Wait 1 second
                    using (StreamWriter writer = new StreamWriter(pipeClient))
                    {
                        writer.Write(messageJson);
                        writer.Flush();
                    }
                    return; // Exit, as message was sent to existing instance
                }
            }
            catch (TimeoutException)
            {
                // No existing instance, proceed to start new instance
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to connect to pipe: {ex.Message}");
            }

            // Start new instance
            var mainForm = new MainForm(messageJson);
            Application.Run(mainForm);
        }
    }
}
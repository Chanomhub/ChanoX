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

            // Create environment with additional command line args to disable web security
            var environmentOptions = new CoreWebView2EnvironmentOptions();
            environmentOptions.AdditionalBrowserArguments = "--disable-web-security --disable-site-isolation-trials --disable-features=BlockInsecurePrivateNetworkRequests";
            
            var environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder, environmentOptions);
            await webView.EnsureCoreWebView2Async(environment);
            Console.WriteLine($"WebView2 initialized for downloadId: {downloadId}");
            
            // Add a handler for WebResourceRequested to modify headers
            webView.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            webView.CoreWebView2.WebResourceRequested += (sender, e) => {
                try {
                    // Modify request headers to help with CORS issues
                    var requestHeaders = e.Request.Headers;
                    Uri uri = new Uri(e.Request.Uri);
                    string origin = $"{uri.Scheme}://{uri.Host}";
                    if (!uri.IsDefaultPort) {
                        origin += $":{uri.Port}";
                    }
            
                    // Set headers to help with CORS
                    requestHeaders.RemoveHeader("Origin");
                    requestHeaders.SetHeader("Origin", origin);
                    
                    // Other helpful headers
                    requestHeaders.SetHeader("Access-Control-Request-Method", "GET, POST, PUT, DELETE, OPTIONS");
                    requestHeaders.SetHeader("Access-Control-Request-Headers", "*");
                }
                catch (Exception ex) {
                    Console.WriteLine($"Error modifying request headers: {ex.Message}");
                }
            };

            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            
            // Disable security restrictions (CSP and CORS)
            webView.CoreWebView2.Settings.IsWebMessageEnabled = true;
            webView.CoreWebView2.Settings.IsScriptEnabled = true;
            webView.CoreWebView2.Settings.AreHostObjectsAllowed = true;
            webView.CoreWebView2.Settings.AreDefaultScriptDialogsEnabled = true;
            
            // Configure WebView2 to bypass CORS
            var options = environment.CreateCoreWebView2ControllerOptions();
            webView.CoreWebView2.Settings.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62";
                        
            // Use NavigationStarting to disable CSP by setting appropriate headers via script
            webView.CoreWebView2.NavigationStarting += (s, e) => {
                // We'll disable CSP entirely by using JavaScript to handle this instead
                Console.WriteLine($"Navigation starting to: {e.Uri}");
            };
            
            // Add script to disable CSP after navigation completes
            webView.CoreWebView2.NavigationCompleted += (s, e) => {
                // Inject script to disable CSP
                webView.CoreWebView2.ExecuteScriptAsync(@"
                    // Remove existing CSP meta tags
                    document.querySelectorAll('meta[http-equiv=""Content-Security-Policy""]').forEach(el => el.remove());
                    
                    // Monitor for any dynamically added CSP tags
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach(mutation => {
                            if (mutation.addedNodes) {
                                mutation.addedNodes.forEach(node => {
                                    if (node.tagName === 'META' && 
                                        node.httpEquiv && 
                                        node.httpEquiv.toLowerCase() === 'content-security-policy') {
                                        node.remove();
                                    }
                                });
                            }
                        });
                    });
                    observer.observe(document.documentElement, { childList: true, subtree: true });
                    
                    // Override fetch and XMLHttpRequest to handle CORS issues
                    const originalFetch = window.fetch;
                    window.fetch = function(resource, init) {
                        if (init) {
                            init.mode = 'cors';
                            init.credentials = 'include';
                            if (!init.headers) {
                                init.headers = {};
                            }
                        }
                        return originalFetch(resource, init);
                    };
                    
                    console.log('CSP and CORS restrictions have been disabled');
                ");
                
                Console.WriteLine("Injected CSP/CORS bypass script");
            };

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
                
                // Notify user that download is about to start
                DialogResult startDownloadResult = MessageBox.Show(
                    $"Download is about to start\nFile: {suggestedFileName}\nLocation: {normalizedSaveFolder}",
                    "Download Starting",
                    MessageBoxButtons.OKCancel,
                    MessageBoxIcon.Information);
                
                if (startDownloadResult == DialogResult.Cancel)
                {
                    e.Cancel = true;
                    PostMessage(new { 
                        status = "cancelled", 
                        message = "Download cancelled by user", 
                        downloadId 
                    });
                    this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                    return;
                }
                
                // Check if file already exists and prompt for overwrite
                if (File.Exists(fullPath))
                {
                    DialogResult overwriteResult = MessageBox.Show(
                        $"A file with the name '{suggestedFileName}' already exists.\nDo you want to overwrite it?",
                        "File Already Exists",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Warning);
                    
                    if (overwriteResult == DialogResult.No)
                    {
                        // User chose not to overwrite, prompt for new filename
                        SaveFileDialog saveDialog = new SaveFileDialog
                        {
                            InitialDirectory = normalizedSaveFolder,
                            FileName = suggestedFileName,
                            Title = "Save Download As"
                        };
                        
                        if (saveDialog.ShowDialog() == DialogResult.OK)
                        {
                            fullPath = saveDialog.FileName;
                            suggestedFileName = Path.GetFileName(fullPath);
                        }
                        else
                        {
                            // User cancelled the save dialog
                            e.Cancel = true;
                            PostMessage(new { 
                                status = "cancelled", 
                                message = "Download cancelled by user", 
                                downloadId 
                            });
                            this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                            return;
                        }
                    }
                    // If user chose Yes, we'll use the original path and overwrite
                }
                
                e.ResultFilePath = fullPath;
                e.Handled = true;

                Console.WriteLine($"Downloading to: {fullPath}");
                // Send initial download status with downloadStarted flag
                PostMessage(new { 
                    status = "progress", 
                    message = $"Starting download to: {fullPath}", 
                    downloadId,
                    progress = 0.1f, 
                    downloadStarted = true,
                    filename = suggestedFileName
                });
        
                e.DownloadOperation.StateChanged += (s, args) =>
                {
                    try
                    {
                        Console.WriteLine($"Download state changed: {e.DownloadOperation.State}");
                        if (e.DownloadOperation.State == CoreWebView2DownloadState.InProgress)
                        {
                            // Explicitly report download is in progress
                            PostMessage(new { 
                                status = "progress", 
                                message = $"Download in progress: {fullPath}", 
                                downloadId, 
                                progress = 1.0f
                            });
                        }
                        else if (e.DownloadOperation.State == CoreWebView2DownloadState.Completed)
                        {
                            Console.WriteLine($"Download completed: {fullPath}");
                            PostMessage(new { 
                                status = "success", 
                                message = $"Download completed: {fullPath}", 
                                downloadId, 
                                path = fullPath,
                                filename = suggestedFileName
                            });
                            this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                        }
                        else if (e.DownloadOperation.State == CoreWebView2DownloadState.Interrupted)
                        {
                            Console.WriteLine($"Download interrupted: {e.DownloadOperation.InterruptReason}");
                            PostMessage(new { 
                                status = "error", 
                                message = $"Download interrupted: {e.DownloadOperation.InterruptReason}", 
                                downloadId 
                            });
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
                        // Ensure progress is at least 1% to show activity
                        if (progress < 1.0f && bytesReceived > 0) progress = 1.0f;
                        Console.WriteLine($"Download progress: {progress}%");
                        PostMessage(new { 
                            status = "progress", 
                            message = $"Progress: {progress}%", 
                            downloadId, 
                            progress
                        });
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
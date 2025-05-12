using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using System.Drawing;

namespace TauriWebView2Download
{
    public class MainForm : Form
    {
        private TabControl tabControl;
        private string customUserDataFolder;
        private bool isClosing;
        private readonly PipeServer pipeServer;

        public MainForm(string initialMessage)
        {
            InitializeForm();
            pipeServer = new PipeServer(this);
            pipeServer.Start();
            if (!string.IsNullOrEmpty(initialMessage))
            {
                _ = ProcessInitialMessage(initialMessage); // Fire-and-forget async call
            }
        }

        private void InitializeForm()
        {
            // Set form properties
            this.Text = "WebView2 Download Manager";
            this.Size = new Size(800, 600);
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
                Utils.PostMessage(new { status = "error", message = $"Failed to parse initial message: {ex.Message}" });
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
                Utils.PostMessage(new { status = "error", message = "Invalid or missing URL", downloadId });
                return;
            }

            if (string.IsNullOrEmpty(saveFolder) || !Utils.IsValidPath(saveFolder))
            {
                Utils.PostMessage(new { status = "error", message = "Invalid or missing save folder path", downloadId });
                return;
            }

            if (string.IsNullOrEmpty(downloadId))
            {
                Utils.PostMessage(new { status = "error", message = "Missing download ID" });
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
            Utils.PostMessage(new { status = "success", message = $"Navigating to: {downloadUrl} with save folder: {saveFolder}", downloadId });
        }

        private void CoreWebView2_DownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e,
            string saveFolder, string downloadId, string filename, WebView2 webView, TabPage tabPage)
        {
            try
            {
                Console.WriteLine($"Download starting for URI: {e.DownloadOperation.Uri}");
                if (string.IsNullOrEmpty(saveFolder))
                {
                    Utils.PostMessage(new { status = "error", message = "Save folder not specified", downloadId });
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
                Utils.PostMessage(new { status = "success", message = $"Downloading to: {fullPath}", downloadId });

                e.DownloadOperation.StateChanged += (s, args) =>
                {
                    try
                    {
                        if (e.DownloadOperation.State == CoreWebView2DownloadState.Completed)
                        {
                            Console.WriteLine($"Download completed: {fullPath}");
                            Utils.PostMessage(new { status = "success", message = $"Download completed: {fullPath}", downloadId, path = fullPath });
                            this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                        }
                        else if (e.DownloadOperation.State == CoreWebView2DownloadState.Interrupted)
                        {
                            Console.WriteLine($"Download interrupted: {e.DownloadOperation.InterruptReason}");
                            Utils.PostMessage(new { status = "error", message = $"Download interrupted: {e.DownloadOperation.InterruptReason}", downloadId });
                            this.Invoke((Action)(() => RemoveTab(tabPage, webView)));
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Download state error: {ex.Message}");
                        Utils.PostMessage(new { status = "error", message = $"Download state error: {ex.Message}", downloadId });
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
                        Utils.PostMessage(new { status = "progress", message = $"Progress: {progress}%", downloadId, progress });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Progress update error: {ex.Message}");
                        Utils.PostMessage(new { status = "error", message = $"Progress update error: {ex.Message}", downloadId });
                    }
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Download failed: {ex.Message}");
                Utils.PostMessage(new { status = "error", message = $"Download failed: {ex.Message}", downloadId });
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

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            isClosing = true;
            pipeServer.Dispose();

            foreach (TabPage tab in tabControl.TabPages)
            {
                foreach (Control control in tab.Controls)
                {
                    if (control is WebView2 webView)
                    {
                        webView.Dispose();
                    }
                }
            }
            tabControl.Dispose();
        }
    }
}
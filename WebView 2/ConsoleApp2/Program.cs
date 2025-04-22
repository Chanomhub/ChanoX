using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace TauriWebView2Download
{
    public class MainForm : Form
    {
        private WebView2 webView;
        private string customUserDataFolder;
        private string downloadUrl;
        private string saveFolder;
        private string downloadId;
        private string filename;
        private string initialMessage;

        public MainForm(string initialMessage)
        {
            this.initialMessage = initialMessage;
            this.Load += MainForm_Load; // Subscribe to Load event
        }

        private async void MainForm_Load(object sender, EventArgs e)
        {
            await InitializeWebViewAsync();
            if (!string.IsNullOrEmpty(initialMessage))
            {
                try
                {
                    dynamic data = JsonConvert.DeserializeObject(initialMessage);
                    HandleInitialMessage(data);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to parse initial message: {ex.Message}");
                    PostMessage(new { status = "error", message = $"Failed to parse initial message: {ex.Message}" });
                }
            }

        }
        private async Task InitializeWebViewAsync()
        {
            customUserDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TauriWebView2Download");
            Console.WriteLine($"Creating WebView2 user data folder: {customUserDataFolder}");
            Directory.CreateDirectory(customUserDataFolder);

            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: customUserDataFolder);
            Console.WriteLine("WebView2 environment created successfully");

            webView = new WebView2 { Dock = DockStyle.Fill };
            this.Controls.Add(webView);

            await webView.EnsureCoreWebView2Async(environment);
            Console.WriteLine("WebView2 initialized");

            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            webView.CoreWebView2.DownloadStarting += CoreWebView2_DownloadStarting;

            webView.CoreWebView2.NavigateToString("<html><body><h1>WebView2 Download</h1></body></html>");
        }

        private async void InitializeWebView()
        {
            customUserDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TauriWebView2Download");
            Console.WriteLine($"Creating WebView2 user data folder: {customUserDataFolder}");
            Directory.CreateDirectory(customUserDataFolder);

            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: customUserDataFolder);
            Console.WriteLine("WebView2 environment created successfully");

            webView = new WebView2
            {
                Dock = DockStyle.Fill
            };
            this.Controls.Add(webView);

            await webView.EnsureCoreWebView2Async(environment);
            Console.WriteLine("WebView2 initialized");

            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            webView.CoreWebView2.DownloadStarting += CoreWebView2_DownloadStarting;

            webView.CoreWebView2.NavigateToString("<html><body><h1>WebView2 Download</h1></body></html>");
        }

        public void HandleInitialMessage(dynamic data)
        {
            try
            {
                Console.WriteLine($"Received initial message: {JsonConvert.SerializeObject(data)}");
                string action = data.action;
                if (action == "setDownload")
                {
                    downloadUrl = data.url?.ToString();
                    saveFolder = data.saveFolder?.ToString();
                    downloadId = data.downloadId?.ToString();
                    filename = data.filename?.ToString();

                    Console.WriteLine($"Download details: URL={downloadUrl}, SaveFolder={saveFolder}, DownloadId={downloadId}, Filename={filename}");

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

                    // At this point, WebView2 is guaranteed to be initialized
                    webView.CoreWebView2.Navigate(downloadUrl);
                    Console.WriteLine($"Navigating to: {downloadUrl}");
                    PostMessage(new { status = "success", message = $"Navigating to: {downloadUrl} with save folder: {saveFolder}", downloadId });
                }
                else
                {
                    PostMessage(new { status = "error", message = "Unknown action", downloadId = data.downloadId?.ToString() });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in HandleInitialMessage: {ex.Message}");
                PostMessage(new { status = "error", message = $"Error in HandleInitialMessage: {ex.Message}", downloadId = data.downloadId?.ToString() });
            }
        }

        private void CoreWebView2_DownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e)
        {
            try
            {
                Console.WriteLine($"Download starting for URI: {e.DownloadOperation.Uri}");
                if (string.IsNullOrEmpty(saveFolder))
                {
                    PostMessage(new { status = "error", message = "Save folder not specified", downloadId });
                    return;
                }

                // Fix path handling for UNC paths
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
                            this.Close();
                        }
                        else if (e.DownloadOperation.State == CoreWebView2DownloadState.Interrupted)
                        {
                            Console.WriteLine($"Download interrupted: {e.DownloadOperation.InterruptReason}");
                            PostMessage(new { status = "error", message = $"Download interrupted: {e.DownloadOperation.InterruptReason}", downloadId });
                            this.Close();
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Download state error: {ex.Message}");
                        PostMessage(new { status = "error", message = $"Download state error: {ex.Message}", downloadId });
                        this.Close();
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

        private void PostMessage(object message)
        {
            try
            {
                // Ensure downloadId is included in every message if available
                if (message is Dictionary<string, object> dict)
                {
                    if (!dict.ContainsKey("downloadId") && !string.IsNullOrEmpty(downloadId))
                    {
                        dict["downloadId"] = downloadId;
                    }
                }

                string json = JsonConvert.SerializeObject(message);
                Console.WriteLine($"Sending to stdout: {json}");
                // Send through stderr as well to ensure Tauri receives it
                Console.Error.WriteLine(json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error serializing message: {ex.Message}");
                try
                {
                    Console.Error.WriteLine(JsonConvert.SerializeObject(new
                    {
                        status = "error",
                        message = $"Error serializing message: {ex.Message}",
                        downloadId = downloadId
                    }));
                }
                catch
                {
                    // Last resort error reporting
                    Console.Error.WriteLine($"{{\"status\":\"error\",\"message\":\"Critical error\",\"downloadId\":\"{downloadId}\"}}");
                }
            }
        }

        private bool IsValidPath(string path)
        {
            try
            {
                // Handle UNC paths
                string normalizedPath = path;
                if (normalizedPath.StartsWith(@"\\?\"))
                {
                    normalizedPath = normalizedPath.Substring(4);
                }

                // Just check if we can get a full path without exceptions
                Path.GetFullPath(normalizedPath);
                return true;
            }
            catch
            {
                return false;
            }
        }

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Console.WriteLine($"Command-line args: {string.Join(", ", args)}");
            string messageJson = args.Length > 0 ? args[0] : null;
            var mainForm = new MainForm(messageJson); // Pass message to constructor

            Application.Run(mainForm);
        }
    }
}
import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Types
interface ArticleFormData {
    title: string;
    description: string;
    body: string;
    tagList: string;
    categoryList: string;
    platformList: string;
    status: "DRAFT" | "PUBLISHED";
    mainImage: string;
    images: string;
    mainImageFile?: string;
    additionalImageFiles: string[];
}

interface DownloadData {
    downloadName: string;
    downloadUrl: string;
    isActive: boolean;
}

interface ArticlePayload {
    article: {
        title: string;
        description: string;
        body: string;
        tagList: string[];
        categoryList: string[];
        platformList: string[];
        status: string;
        mainImage: string;
        images: string[];
    };
}

// Step Indicator Component
const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => (
    <div className="flex justify-center mb-6 space-x-4">
        {["Article", "Download", "Summary"].map((_, index) => (
            <div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    currentStep === index + 1 ? "bg-primary text-white border-primary" : "bg-base-100 text-gray-600"
                }`}
            >
                {index + 1}
            </div>
        ))}
    </div>
);

// Error Alert Component
const ErrorAlert: React.FC<{ message: string | null }> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="alert alert-error shadow-lg mt-6">
            <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                    />
                </svg>
                <span>{message}</span>
            </div>
        </div>
    );
};

// Loading Indicator
const LoadingIndicator: React.FC = () => (
    <div className="mt-4 text-center">
        <p>Loading...</p>
    </div>
);

// Article Form Component (Step 1)
const ArticleForm: React.FC<{
    formData: ArticleFormData;
    handleChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => void;
    handleFileSelect: (
        name: "mainImageFile" | "additionalImageFiles"
    ) => Promise<void>;
    publishNote: string;
    setPublishNote: (note: string) => void;
    handleSubmit: () => Promise<void>;
    isLoading: boolean;
}> = ({
          formData,
          handleChange,
          handleFileSelect,
          publishNote,
          setPublishNote,
          handleSubmit,
          isLoading,
      }) => {
    return (
        <div className="max-w-4xl mx-auto  shadow-lg rounded-xl p-8 space-y-8">
            <h2 className="text-3xl font-bold text-center">
                กรอกข้อมูลบทความ
            </h2>
            <form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* ส่วนข้อมูลหลัก */}
                    <div className="space-y-6">
                        <div className="flex flex-col">
                            <label htmlFor="title" className="mb-2 font-semibold ">
                                หัวข้อ
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="กรอกหัวข้อบทความ"
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label
                                htmlFor="description"
                                className="mb-2 font-semibold "
                            >
                                คำอธิบาย
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="คำอธิบายบทความ"
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="body" className="mb-2 font-semibold ">
                                เนื้อหา
                            </label>
                            <textarea
                                id="body"
                                name="body"
                                value={formData.body}
                                onChange={handleChange}
                                placeholder="เนื้อหาบทความ"
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                                required
                            />
                        </div>
                    </div>

                    {/* ส่วนข้อมูลเพิ่มเติม */}
                    <div className="space-y-6">
                        <div className="flex flex-col">
                            <label htmlFor="tagList" className="mb-2 font-semibold ">
                                แท็ก (คั่นด้วยคอมม่า)
                            </label>
                            <input
                                type="text"
                                id="tagList"
                                name="tagList"
                                value={formData.tagList}
                                onChange={handleChange}
                                placeholder="ตัวอย่าง: React, JavaScript"
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label
                                htmlFor="categoryList"
                                className="mb-2 font-semibold "
                            >
                                หมวดหมู่ (คั่นด้วยคอมม่า)
                            </label>
                            <input
                                type="text"
                                id="categoryList"
                                name="categoryList"
                                value={formData.categoryList}
                                onChange={handleChange}
                                placeholder="ตัวอย่าง: เทคโนโลยี, บันเทิง"
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label
                                htmlFor="platformList"
                                className="mb-2 font-semibold "
                            >
                                แพลตฟอร์ม (คั่นด้วยคอมม่า)
                            </label>
                            <input
                                type="text"
                                id="platformList"
                                name="platformList"
                                value={formData.platformList}
                                onChange={handleChange}
                                placeholder="ตัวอย่าง: Web, Mobile"
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="status" className="mb-2 font-semibold ">
                                สถานะ
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="DRAFT">ฉบับร่าง</option>
                                <option value="PUBLISHED">เผยแพร่</option>
                            </select>
                        </div>
                        {formData.status === "PUBLISHED" && (
                            <div className="flex flex-col">
                                <label
                                    htmlFor="publishNote"
                                    className="mb-2 font-semibold "
                                >
                                    หมายเหตุสำหรับการเผยแพร่
                                </label>
                                <textarea
                                    id="publishNote"
                                    name="publishNote"
                                    value={publishNote}
                                    onChange={(e) => setPublishNote(e.target.value)}
                                    placeholder="ใส่หมายเหตุ (ถ้ามี)"
                                    className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                />
                            </div>
                        )}
                        {/* ส่วนการเลือกภาพ */}
                        <div className="space-y-4">
                            <ImageSelector
                                label="รูปภาพหลัก"
                                imageUrl={formData.mainImage}
                                imagePath={formData.mainImageFile}
                                name="mainImage"
                                selectType="mainImageFile"
                                handleChange={handleChange}
                                handleFileSelect={handleFileSelect}
                                placeholder="หรือระบุ URL"
                                isDisabled={!!formData.mainImageFile}
                            />
                            <ImageSelector
                                label="รูปภาพเพิ่มเติม"
                                imageUrl={formData.images}
                                imagePaths={formData.additionalImageFiles}
                                name="images"
                                selectType="additionalImageFiles"
                                handleChange={handleChange}
                                handleFileSelect={handleFileSelect}
                                placeholder="หรือระบุ URLs (คั่นด้วยคอมม่า)"
                                isDisabled={formData.additionalImageFiles.length > 0}
                                isMultiple={true}
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={`w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                            isLoading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        disabled={isLoading}
                    >
                        {isLoading ? "กำลังส่ง..." : "สร้างบทความ"}
                    </button>
                </div>
            </form>
        </div>
    );
};

// Image Selector Component
const ImageSelector: React.FC<{
    label: string;
    imageUrl: string;
    imagePath?: string;
    imagePaths?: string[];
    name: string;
    selectType: "mainImageFile" | "additionalImageFiles";
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileSelect: (name: "mainImageFile" | "additionalImageFiles") => Promise<void>;
    placeholder: string;
    isDisabled: boolean;
    isMultiple?: boolean;
}> = ({
          label,
          imageUrl,
          imagePath,
          imagePaths = [],
          name,
          selectType,
          handleChange,
          handleFileSelect,
          placeholder,
          isDisabled,
          isMultiple = false
      }) => {
    return (
        <div className="form-control space-y-2">
            <label className="label">{label}</label>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => handleFileSelect(selectType)}
                    className="btn btn-outline btn-sm"
                >
                    เลือก{isMultiple ? "รูปภาพเพิ่มเติม" : "รูปภาพ"}
                </button>
                <input
                    type="text"
                    name={name}
                    value={imageUrl}
                    onChange={handleChange}
                    disabled={isDisabled}
                    placeholder={placeholder}
                    className="input input-bordered input-sm flex-1"
                />
            </div>
            {imagePath && (
                <p className="text-xs text-gray-500">Selected: {imagePath}</p>
            )}
            {isMultiple && imagePaths.length > 0 && (
                <ul className="text-xs text-gray-500 list-disc list-inside">
                    {imagePaths.map((file, index) => (
                        <li key={index}>{file}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// Download Form Component (Step 2)
const DownloadForm: React.FC<{
    downloadData: DownloadData;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: () => Promise<void>;
    downloadLinks: any[];
    isLoading: boolean;
    onPrevious: () => void;
    onNext: () => void;
}> = ({ downloadData, handleChange, handleSubmit, downloadLinks, isLoading, onPrevious, onNext }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">
                ขั้นตอน 2: เพิ่มลิงค์ดาวน์โหลด (สามารถสร้างได้หลายลิงค์)
            </h2>
            <div className="card bg-base-100 shadow-lg p-6">
                <div className="form-control mb-4">
                    <label className="label">ชื่อลิงค์</label>
                    <input
                        type="text"
                        name="downloadName"
                        value={downloadData.downloadName}
                        onChange={handleChange}
                        className="input input-bordered"
                        required
                    />
                </div>
                <div className="form-control mb-4">
                    <label className="label">URL</label>
                    <input
                        type="text"
                        name="downloadUrl"
                        value={downloadData.downloadUrl}
                        onChange={handleChange}
                        className="input input-bordered"
                        required
                    />
                </div>
                <div className="form-control mb-4">
                    <label className="cursor-pointer label">
                        <span className="label-text">แอคทีฟ</span>
                        <input
                            type="checkbox"
                            name="isActive"
                            checked={downloadData.isActive}
                            onChange={handleChange}
                            className="checkbox checkbox-primary"
                        />
                    </label>
                </div>
                <div className="flex justify-between">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={`btn btn-primary ${isLoading ? "loading" : ""}`}
                        disabled={isLoading}
                    >
                        {isLoading ? "กำลังส่ง..." : "สร้างลิงค์ดาวน์โหลด"}
                    </button>
                    <button type="button" onClick={onNext} className="btn btn-secondary">
                        เสร็จสิ้น
                    </button>
                </div>
            </div>
            {downloadLinks.length > 0 && <DownloadLinksList links={downloadLinks} />}
            <div className="flex justify-start mt-4">
                <button type="button" onClick={onPrevious} className="btn btn-outline">
                    กลับแก้ไขบทความ
                </button>
            </div>
        </div>
    );
};

// Download Links List Component
const DownloadLinksList: React.FC<{ links: any[] }> = ({ links }) => {
    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">ลิงค์ดาวน์โหลดที่สร้างแล้ว</h3>
            <ul className="list-disc list-inside">
                {links.map((link, index) => (
                    <li key={index}>
                        {link.name}: {link.url} {link.isActive ? "(แอคทีฟ)" : "(ไม่แอคทีฟ)"}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Summary Component (Step 3)
const SummaryStep: React.FC<{
    response: any;
    downloadLinks: any[];
    onReset: () => void;
}> = ({ response, downloadLinks, onReset }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">สรุปผล</h2>
            {response ? (
                <div className="alert alert-success shadow-lg">
                    <div className="flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>ดำเนินการสำเร็จ</span>
                    </div>
                    <pre className="text-xs overflow-x-auto">{JSON.stringify({ response, downloadLinks }, null, 2)}</pre>
                </div>
            ) : (
                <p>ยังไม่มีผลการทำรายการ</p>
            )}
            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={onReset}
                    className="btn btn-outline"
                >
                    สร้างใหม่
                </button>
            </div>
        </div>
    );
};

// Main Component
const CreateArticle: React.FC = () => {
    const [step, setStep] = useState<number>(1);
    const [formData, setFormData] = useState<ArticleFormData>({
        title: "",
        description: "",
        body: "",
        tagList: "",
        categoryList: "",
        platformList: "",
        status: "DRAFT",
        mainImage: "",
        images: "",
        additionalImageFiles: [],
    });
    const [downloadData, setDownloadData] = useState<DownloadData>({
        downloadName: "",
        downloadUrl: "",
        isActive: true,
    });
    const [downloadLinks, setDownloadLinks] = useState<any[]>([]);
    const [articleId, setArticleId] = useState<number | null>(null);
    const [publishNote, setPublishNote] = useState<string>("");
    const [response, setResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleArticleFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDownloadFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setDownloadData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleFileSelect = async (name: "mainImageFile" | "additionalImageFiles") => {
        try {
            const selected = await open({
                multiple: name === "additionalImageFiles",
                filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif"] }],
            });
            if (selected === null) {
                console.log("File selection canceled by user");
                return;
            }
            if (name === "mainImageFile" && typeof selected === "string") {
                setFormData((prev) => ({
                    ...prev,
                    mainImageFile: selected,
                    mainImage: "",
                }));
            } else if (Array.isArray(selected)) {
                setFormData((prev) => ({
                    ...prev,
                    additionalImageFiles: selected,
                    images: "",
                }));
            } else {
                throw new Error("Unexpected return type from file dialog");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error("Failed to select file:", errorMessage);
            setError(`Failed to select file: ${errorMessage}`);
        }
    };

    const uploadToCloudinary = async (filePath: string, publicId?: string): Promise<string> => {
        try {
            const config = await invoke("get_cloudinary_config");
            if (!config) {
                setError("Cloudinary configuration not set. Please configure it in Settings.");
                throw new Error("Cloudinary configuration not set");
            }
            const secureUrl = await invoke<string>("upload_to_cloudinary", {
                filePath,
                publicId,
            });
            return secureUrl;
        } catch (err) {
            console.error("Failed to upload to Cloudinary:", err);
            throw new Error(`Upload failed: ${err}`);
        }
    };

    const handlePublishRequest = async (slug: string) => {
        try {
            const tokenResult = await invoke<string | null>("get_token");
            if (!tokenResult) {
                throw new Error("No authentication token found. Please login first.");
            }
            const result = await fetch(`https://api.chanomhub.online/api/articles/${slug}/publish-request`, {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenResult}`,
                },
                body: JSON.stringify({ note: publishNote || "Request to publish article" }),
            });

            if (!result.ok) {
                const errorText = await result.text();
                throw new Error(`Publish request failed with status ${result.status}: ${errorText || result.statusText}`);
            }
            return await result.json();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Publish request failed";
            setError(errorMessage);
            console.error("Publish request error:", err);
            throw err;
        }
    };

    const handleSubmitArticle = async () => {
        setIsLoading(true);
        setError(null);
        setResponse(null);
        try {
            const tokenResult = await invoke<string | null>("get_token");
            if (!tokenResult) {
                throw new Error("No authentication token found. Please login first.");
            }
            let mainImageUrl = formData.mainImage;
            let imageUrls = formData.images.split(",").map((img) => img.trim()).filter(Boolean);

            if (formData.mainImageFile) {
                mainImageUrl = await uploadToCloudinary(formData.mainImageFile, `article_main_${Date.now()}`);
            }
            if (formData.additionalImageFiles.length > 0) {
                const uploadPromises = formData.additionalImageFiles.map((filePath, index) =>
                    uploadToCloudinary(filePath, `article_additional_${Date.now()}_${index}`)
                );
                const uploadedUrls = await Promise.all(uploadPromises);
                imageUrls = [...imageUrls, ...uploadedUrls];
            }

            const articlePayload: ArticlePayload = {
                article: {
                    title: formData.title,
                    description: formData.description,
                    body: formData.body,
                    tagList: formData.tagList.split(",").map((t) => t.trim()).filter(Boolean),
                    categoryList: formData.categoryList.split(",").map((c) => c.trim()).filter(Boolean),
                    platformList: formData.platformList.split(",").map((p) => p.trim()).filter(Boolean),
                    status: formData.status,
                    mainImage: mainImageUrl || "",
                    images: imageUrls,
                },
            };

            const result = await fetch("https://api.chanomhub.online/api/articles", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenResult}`,
                },
                body: JSON.stringify(articlePayload),
            });

            if (!result.ok) {
                const errorText = await result.text();
                throw new Error(`Request failed with status ${result.status}: ${errorText || result.statusText}`);
            }

            const data = await result.json();
            setResponse(data);
            setArticleId(data.article.id);

            if (formData.status === "PUBLISHED" && data.article.slug) {
                await handlePublishRequest(data.article.slug);
                setResponse({
                    ...data,
                    publishRequest: "Publish request submitted successfully",
                });
            }
            setStep(2);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "An unexpected error occurred while creating the article";
            setError(errorMessage);
            console.error("Error details:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitDownload = async () => {
        if (!articleId) {
            setError("บทความยังไม่ถูกสร้าง โปรดสร้างบทความก่อน");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const tokenResult = await invoke<string | null>("get_token");
            if (!tokenResult) {
                throw new Error("No authentication token found. Please login first.");
            }
            const result = await fetch("https://api.chanomhub.online/api/downloads", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenResult}`,
                },
                body: JSON.stringify({
                    articleId,
                    name: downloadData.downloadName,
                    url: downloadData.downloadUrl,
                    isActive: downloadData.isActive,
                }),
            });

            if (!result.ok) {
                const errorText = await result.text();
                throw new Error(`Request failed with status ${result.status}: ${errorText || result.statusText}`);
            }

            const data = await result.json();
            setDownloadLinks((prev) => [...prev, data]);
            setDownloadData({ downloadName: "", downloadUrl: "", isActive: true });
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred while creating the download link";
            setError(errorMessage);
            console.error("Error details:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setFormData({
            title: "",
            description: "",
            body: "",
            tagList: "",
            categoryList: "",
            platformList: "",
            status: "DRAFT",
            mainImage: "",
            images: "",
            additionalImageFiles: [],
        });
        setDownloadData({
            downloadName: "",
            downloadUrl: "",
            isActive: true,
        });
        setDownloadLinks([]);
        setArticleId(null);
        setPublishNote("");
        setResponse(null);
        setError(null);
    };

    return (
        <div className="container max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-center mb-4">📝 สร้างบทความใหม่</h1>
            <StepIndicator currentStep={step} />

            {step === 1 && (
                <ArticleForm
                    formData={formData}
                    handleChange={handleArticleFormChange}
                    handleFileSelect={handleFileSelect}
                    publishNote={publishNote}
                    setPublishNote={setPublishNote}
                    handleSubmit={handleSubmitArticle}
                    isLoading={isLoading}
                />
            )}

            {step === 2 && (
                <DownloadForm
                    downloadData={downloadData}
                    handleChange={handleDownloadFormChange}
                    handleSubmit={handleSubmitDownload}
                    downloadLinks={downloadLinks}
                    isLoading={isLoading}
                    onPrevious={() => setStep(1)}
                    onNext={() => setStep(3)}
                />
            )}

            {step === 3 && (
                <SummaryStep
                    response={response}
                    downloadLinks={downloadLinks}
                    onReset={resetForm}
                />
            )}

            <ErrorAlert message={error} />
            {isLoading && <LoadingIndicator />}
        </div>
    );
};

export default CreateArticle;
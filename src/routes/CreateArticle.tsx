// src/CreateArticle.tsx
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import ArticleForm from './components/articles/ArticleForm';
import DownloadForm from './components/articles/DownloadForm';
import SummaryStep from './components/articles/SummaryStep';
import StepIndicator from './components/articles/StepIndicator';
import ErrorAlert from './components/articles/ErrorAlert';
import LoadingIndicator from './components/articles/LoadingIndicator';
import { ArticleFormData, DownloadData, ArticlePayload } from './components/articles/types';

const CreateArticle: React.FC = () => {
    const [step, setStep] = useState<number>(1);
    const [formData, setFormData] = useState<ArticleFormData>({
        title: '',
        description: '',
        body: '',
        tagList: '',
        categoryList: '',
        platformList: '',
        status: 'DRAFT',
        engine: '',
        mainImage: '',
        images: '',
        additionalImageFiles: [],
    });
    const [downloadData, setDownloadData] = useState<DownloadData>({
        downloadName: '',
        downloadUrl: '',
        isActive: true,
    });
    const [downloadLinks, setDownloadLinks] = useState<any[]>([]);
    const [articleId, setArticleId] = useState<number | null>(null);
    const [publishNote, setPublishNote] = useState<string>('');
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

    const handleDownloadFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setDownloadData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleFileSelect = async (name: 'mainImageFile' | 'additionalImageFiles') => {
        try {
            const selected = await open({
                multiple: name === 'additionalImageFiles',
                filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
            });
            if (selected === null) {
                console.log('File selection canceled by user');
                return;
            }
            if (name === 'mainImageFile' && typeof selected === 'string') {
                setFormData((prev) => ({
                    ...prev,
                    mainImageFile: selected,
                    mainImage: '',
                }));
            } else if (Array.isArray(selected)) {
                setFormData((prev) => ({
                    ...prev,
                    additionalImageFiles: selected,
                    images: '',
                }));
            } else {
                throw new Error('Unexpected return type from file dialog');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('Failed to select file:', errorMessage);
            setError(`Failed to select file: ${errorMessage}`);
        }
    };

    const uploadToCloudinary = async (filePath: string, publicId?: string): Promise<string> => {
        try {
            const config = await invoke('get_cloudinary_config');
            if (!config) {
                setError('Cloudinary configuration not set. Please configure it in Settings.');
                throw new Error('Cloudinary configuration not set');
            }
            const secureUrl = await invoke<string>('upload_to_cloudinary', {
                filePath,
                publicId,
            });
            return secureUrl;
        } catch (err) {
            console.error('Failed to upload to Cloudinary:', err);
            throw new Error(`Upload failed: ${err}`);
        }
    };

    const handlePublishRequest = async (slug: string) => {
        try {
            const tokenResult = await invoke<string | null>('get_token');
            if (!tokenResult) {
                throw new Error('No authentication token found. Please login first.');
            }
            const result = await fetch(
                `https://api.chanomhub.online/api/articles/${slug}/publish-request`,
                {
                    method: 'POST',
                    headers: {
                        accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokenResult}`,
                    },
                    body: JSON.stringify({ note: publishNote || 'Request to publish article' }),
                }
            );

            if (!result.ok) {
                const errorText = await result.text();
                throw new Error(
                    `Publish request failed with status ${result.status}: ${errorText || result.statusText}`
                );
            }
            return await result.json();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Publish request failed';
            setError(errorMessage);
            console.error('Publish request error:', err);
            throw err;
        }
    };

    const handleSubmitArticle = async () => {
        setIsLoading(true);
        setError(null);
        setResponse(null);
        try {
            if (!formData.mainImage && !formData.mainImageFile) {
                throw new Error('กรุณาระบุรูปภาพหลัก (ต้องใส่ URL หรือเลือกไฟล์)');
            }

            const tokenResult = await invoke<string | null>('get_token');
            if (!tokenResult) {
                throw new Error('No authentication token found. Please login first.');
            }
            let mainImageUrl = formData.mainImage;
            let imageUrls = formData.images
                .split(',')
                .map((img) => img.trim())
                .filter(Boolean);

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
                    tagList: formData.tagList
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    categoryList: formData.categoryList
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean),
                    platformList: formData.platformList
                        .split(',')
                        .map((p) => p.trim())
                        .filter(Boolean),
                    status: formData.status,
                    mainImage: mainImageUrl || '',
                    images: imageUrls,
                    engine: formData.engine || '',
                },
            };

            const result = await fetch('https://api.chanomhub.online/api/articles', {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
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

            if (formData.status === 'PUBLISHED' && data.article.slug) {
                await handlePublishRequest(data.article.slug);
                setResponse({
                    ...data,
                    publishRequest: 'Publish request submitted successfully',
                });
            }
            setStep(2);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'An unexpected error occurred while creating the article';
            setError(errorMessage);
            console.error('Error details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitDownload = async () => {
        if (!articleId) {
            setError('บทความยังไม่ถูกสร้าง โปรดสร้างบทความก่อน');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const tokenResult = await invoke<string | null>('get_token');
            if (!tokenResult) {
                throw new Error('No authentication token found. Please login first.');
            }
            const result = await fetch('https://api.chanomhub.online/api/downloads', {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
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
            setDownloadData({ downloadName: '', downloadUrl: '', isActive: true });
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'An unexpected error occurred while creating the download link';
            setError(errorMessage);
            console.error('Error details:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setFormData({
            title: '',
            description: '',
            body: '',
            tagList: '',
            categoryList: '',
            platformList: '',
            status: 'DRAFT',
            engine: '',
            mainImage: '',
            images: '',
            additionalImageFiles: [],
        });
        setDownloadData({
            downloadName: '',
            downloadUrl: '',
            isActive: true,
        });
        setDownloadLinks([]);
        setArticleId(null);
        setPublishNote('');
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
                <SummaryStep response={response} downloadLinks={downloadLinks} onReset={resetForm} />
            )}

            <ErrorAlert message={error} />
            {isLoading && <LoadingIndicator />}
        </div>
    );
};

export default CreateArticle;
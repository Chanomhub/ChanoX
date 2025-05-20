import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SummaryStepProps {
    response: any;
    downloadLinks: any[];
    onReset: () => void;
}

interface PublishRequestResponse {
    id: number;
    slug: string;
    title: string;
    description: string;
    body: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    status: string;
    engine: string;
    mainImage: string;
    images: string[];
    tagList: string[];
    categoryList: string[];
    platformList: string[];
    author?: {
        username: string;
        bio: string;
        image: string;
        backgroundImage: string | null;
        following: boolean;
        socialMediaLinks: { platform: string; url: string }[];
    };
    favorited: boolean;
    favoritesCount: number;
    backgroundImage: string | null;
    coverImage: string | null;
}

const SummaryStep: React.FC<SummaryStepProps> = ({ response, downloadLinks, onReset }) => {
    const [requestNote, setRequestNote] = useState<string>('');
    const [publishStatus, setPublishStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handlePublishRequest = async () => {
        if (!response?.article?.slug) {
            setError('ไม่มี slug ของบทความ');
            return;
        }

        setIsLoading(true);
        setError(null);
        setPublishStatus(null);

        try {
            const tokenResult = await invoke<string | null>('get_token');
            if (!tokenResult) {
                throw new Error('ไม่พบโทเค็นการยืนยันตัวตน กรุณาล็อกอินก่อน');
            }

            const result = await fetch(
                `https://api.chanomhub.online/api/articles/${response.article.slug}/publish-request`,
                {
                    method: 'POST',
                    headers: {
                        accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${tokenResult}`,
                    },
                    body: JSON.stringify({ requestNote: requestNote || 'คำขอเผยแพร่บทความ' }),
                }
            );

            if (!result.ok) {
                const errorText = await result.text();
                throw new Error(`คำขอเผยแพร่ล้มเหลวด้วยสถานะ ${result.status}: ${errorText || result.statusText}`);
            }

            const data: PublishRequestResponse = await result.json();
            if (!data.status) {
                throw new Error('ไม่พบสถานะบทความในคำตอบจาก API');
            }
            setPublishStatus(`ส่งคำขอเผยแพร่สำเร็จ: สถานะ ${data.status}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'คำขอเผยแพร่ล้มเหลว';
            setError(errorMessage);
            console.error('ข้อผิดพลาดคำขอเผยแพร่:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">สรุปผลการสร้างบทความ</h2>

            {response ? (
                <div className="space-y-6">
                    {/* Article Details Card */}
                    <div className="card bg-base-100 shadow-lg p-6 border border-gray-200">
                        <h3 className="text-xl font-semibold mb-4 flex items-center">
                            <svg className="w-6 h-6 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            รายละเอียดบทความ
                        </h3>
                        <div className="space-y-4">
                            <p>
                                <span className="font-semibold">หัวข้อ:</span> {response.article.title}
                            </p>
                            <p>
                                <span className="font-semibold">คำอธิบาย:</span> {response.article.description}
                            </p>
                            <p>
                                <span className="font-semibold">สถานะ:</span>
                                <span className="ml-2 badge badge-warning">ฉบับร่าง</span>
                            </p>
                            <p>
                                <span className="font-semibold">Engine:</span>{' '}
                                {response.article.engine || 'ไม่ระบุ'}
                            </p>
                            <p>
                                <span className="font-semibold">แท็ก:</span>{' '}
                                {response.article.tagList.join(', ')}
                            </p>
                            <p>
                                <span className="font-semibold">หมวดหมู่:</span>{' '}
                                {response.article.categoryList.join(', ')}
                            </p>
                            <p>
                                <span className="font-semibold">แพลตฟอร์ม:</span>{' '}
                                {response.article.platformList.join(', ')}
                            </p>
                            <p>
                                <span className="font-semibold">รูปภาพหลัก:</span>
                                <a
                                    href={response.article.mainImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline ml-1"
                                >
                                    ดูรูปภาพ
                                </a>
                            </p>
                            {response.article.images.length > 0 && (
                                <p>
                                    <span className="font-semibold">รูปภาพเพิ่มเติม:</span>
                                    <ul className="list-disc list-inside ml-4">
                                        {response.article.images.map((img: string, index: number) => (
                                            <li key={index}>
                                                <a
                                                    href={img}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline"
                                                >
                                                    รูปภาพ {index + 1}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </p>
                            )}
                            {publishStatus && (
                                <p className="text-green-600 font-semibold">คำขอเผยแพร่: {publishStatus}</p>
                            )}
                            {error && (
                                <div className="alert alert-error shadow-lg">
                                    <div className="flex items-center">
                                        <svg
                                            className="w-6 h-6 mr-2"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span>{error}</span>
                                    </div>
                                </div>
                            )}
                            {!publishStatus && (
                                <div className="space-y-4">
                                    <div className="flex flex-col">
                                        <label htmlFor="requestNote" className="mb-2 font-semibold">
                                            หมายเหตุสำหรับการเผยแพร่
                                        </label>
                                        <textarea
                                            id="requestNote"
                                            name="requestNote"
                                            value={requestNote}
                                            onChange={(e) => setRequestNote(e.target.value)}
                                            placeholder="ใส่หมายเหตุ (ถ้ามี)"
                                            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handlePublishRequest}
                                        className={`btn btn-primary ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเผยแพร่'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Download Links Card */}
                    {downloadLinks.length > 0 && (
                        <div className="card bg-base-100 shadow-lg p-6 border border-gray-200">
                            <h3 className="text-xl font-semibold mb-4">ลิงค์ดาวน์โหลด</h3>
                            <ul className="space-y-2">
                                {downloadLinks.map((link, index) => (
                                    <li key={index} className="flex items-center justify-between">
                                        <span>
                                            {link.name}:{' '}
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline"
                                            >
                                                {link.url}
                                            </a>
                                        </span>
                                        <span
                                            className={`badge ${
                                                link.isActive ? 'badge-success' : 'badge-error'
                                            }`}
                                        >
                                            {link.isActive ? 'แอคทีฟ' : 'ไม่แอคทีฟ'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <div className="alert alert-warning shadow-lg">
                    <div className="flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>ยังไม่มีผลการทำรายการ</span>
                    </div>
                </div>
            )}

            <div className="flex justify-center mt-6">
                <button type="button" onClick={onReset} className="btn btn-primary">
                    สร้างบทความใหม่
                </button>
            </div>
        </div>
    );
};

export default SummaryStep;
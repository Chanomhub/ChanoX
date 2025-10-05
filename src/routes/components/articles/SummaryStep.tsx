
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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
    ver: string;
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
                    <Card>
                        <CardHeader>
                            <CardTitle>รายละเอียดบทความ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p><span className="font-semibold">หัวข้อ:</span> {response.article.title}</p>
                            <p><span className="font-semibold">คำอธิบาย:</span> {response.article.description}</p>
                            <p><span className="font-semibold">สถานะ:</span> <Badge variant="outline">{response.article.status}</Badge></p>
                            <p><span className="font-semibold">Engine:</span> {response.article.engine || 'ไม่ระบุ'}</p>
                            <p><span className="font-semibold">แท็ก:</span> {response.article.tagList.join(', ')}</p>
                            <p><span className="font-semibold">หมวดหมู่:</span> {response.article.categoryList.join(', ')}</p>
                            <p><span className="font-semibold">แพลตฟอร์ม:</span> {response.article.platformList.join(', ')}</p>
                            <p><span className="font-semibold">รูปภาพหลัก:</span> <a href={response.article.mainImage} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">ดูรูปภาพ</a></p>
                            {response.article.images.length > 0 && (
                                <div>
                                    <span className="font-semibold">รูปภาพเพิ่มเติม:</span>
                                    <ul className="list-disc list-inside ml-4">
                                        {response.article.images.map((img: string, index: number) => (
                                            <li key={index}><a href={img} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">รูปภาพ {index + 1}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {publishStatus && <p className="text-green-600 font-semibold">คำขอเผยแพร่: {publishStatus}</p>}
                            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                            {!publishStatus && (
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="requestNote" className="mb-2 font-semibold">หมายเหตุสำหรับการเผยแพร่</label>
                                        <Textarea id="requestNote" value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="ใส่หมายเหตุ (ถ้ามี)" />
                                    </div>
                                    <Button onClick={handlePublishRequest} disabled={isLoading}>{isLoading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเผยแพร่'}</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {downloadLinks.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>ลิงค์ดาวน์โหลด</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {downloadLinks.map((link, index) => (
                                        <li key={index} className="flex items-center justify-between">
                                            <span>{link.name}: <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.url}</a></span>
                                            <Badge variant={link.isActive ? 'default' : 'destructive'}>{link.isActive ? 'แอคทีฟ' : 'ไม่แอคทีฟ'}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : (
                <Alert>
                    <AlertDescription>ยังไม่มีผลการทำรายการ</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-center mt-6">
                <Button onClick={onReset}>สร้างบทความใหม่</Button>
            </div>
        </div>
    );
};

export default SummaryStep;

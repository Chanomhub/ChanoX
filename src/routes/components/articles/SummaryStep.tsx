
import React from 'react';

interface SummaryStepProps {
    response: any;
    downloadLinks: any[];
    onReset: () => void;
}

const SummaryStep: React.FC<SummaryStepProps> = ({ response, downloadLinks, onReset }) => {
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
                                <span
                                    className={`ml-2 badge ${
                                        response.article.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'
                                    }`}
                                >
                  {response.article.status === 'PUBLISHED' ? 'เผยแพร่' : 'ฉบับร่าง'}
                </span>
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
                            {response.publishRequest && (
                                <p className="text-green-600 font-semibold">
                                    คำขอเผยแพร่: {response.publishRequest}
                                </p>
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
                      {link.name}: <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.url}</a>
                    </span>
                                        <span className={`badge ${link.isActive ? 'badge-success' : 'badge-error'}`}>
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
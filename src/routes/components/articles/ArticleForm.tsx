import React from 'react';
import { ArticleFormData } from './types';
import ImageSelector from './ImageSelector';

interface ArticleFormProps {
    formData: ArticleFormData;
    handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    handleFileSelect: (name: 'mainImageFile' | 'additionalImageFiles') => Promise<void>;
    publishNote: string;
    setPublishNote: (note: string) => void;
    handleSubmit: () => Promise<void>;
    isLoading: boolean;
}

const ArticleForm: React.FC<ArticleFormProps> = ({
                                                     formData,
                                                     handleChange,
                                                     handleFileSelect,
                                                     publishNote,
                                                     setPublishNote,
                                                     handleSubmit,
                                                     isLoading,
                                                 }) => {
    return (
        <div className="max-w-4xl mx-auto shadow-lg rounded-xl p-8 space-y-8">
            <h2 className="text-3xl font-bold text-center">กรอกข้อมูลบทความ</h2>
            <form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Main Info */}
                    <div className="space-y-6">
                        <div className="flex flex-col">
                            <label htmlFor="title" className="mb-2 font-semibold">
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
                            <label htmlFor="description" className="mb-2 font-semibold">
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
                            <label htmlFor="body" className="mb-2 font-semibold">
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

                        <div className="flex flex-col">
                            <label htmlFor="version" className="mb-2 font-semibold">
                                เวอร์ชัน (ถ้าต้องการ)
                            </label>
                            <input
                                type="text"
                                id="version"
                                name="version"
                                value={formData.version}
                                onChange={handleChange}
                                placeholder="ตัวอย่าง: 1.0.0"
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-6">
                        <div className="flex flex-col">
                            <label htmlFor="tagList" className="mb-2 font-semibold">
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
                            <label htmlFor="categoryList" className="mb-2 font-semibold">
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
                            <label htmlFor="platformList" className="mb-2 font-semibold">
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
                            <label htmlFor="status" className="mb-2 font-semibold">
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
                        <div className="flex flex-col">
                            <label htmlFor="engine" className="mb-2 font-semibold">
                                Engine (ถ้าไม่ทราบให้ปล่อยว่าง)
                            </label>
                            <select
                                id="engine"
                                name="engine"
                                value={formData.engine || ''}
                                onChange={handleChange}
                                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">ไม่ระบุ</option>
                                <option value="RENPY">Ren'Py</option>
                                <option value="RPGM">RPG Maker</option>
                                <option value="UNITY">Unity</option>
                                <option value="UNREAL">Unreal Engine</option>
                                <option value="TyranoBuilder">TyranoBuilder</option>
                                <option value="WOLFRPG">Wolf RPG</option>
                                <option value="KIRIKIRI">Kirikiri</option>

                            </select>
                        </div>
                        {formData.status === 'PUBLISHED' && (
                            <div className="flex flex-col">
                                <label htmlFor="publishNote" className="mb-2 font-semibold">
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
                        {/* Image Selectors */}
                        <div className="space-y-4">
                            <ImageSelector
                                label="รูปภาพหลัก (จำเป็น)"
                                imageUrl={formData.mainImage}
                                imagePath={formData.mainImageFile}
                                name="mainImage"
                                selectType="mainImageFile"
                                handleChange={handleChange}
                                handleFileSelect={handleFileSelect}
                                placeholder="ระบุ URL หรือเลือกไฟล์"
                                isDisabled={!!formData.mainImageFile}
                                required={true}
                            />
                            <ImageSelector
                                label="รูปภาพเพิ่มเติม (ไม่จำเป็น)"
                                imageUrl={formData.images}
                                imagePaths={formData.additionalImageFiles}
                                name="images"
                                selectType="additionalImageFiles"
                                handleChange={handleChange}
                                handleFileSelect={handleFileSelect}
                                placeholder="ระบุ URLs (คั่นด้วยคอมม่า, ถ้ามี)"
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
                            isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'กำลังส่ง...' : 'สร้างบทความ'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ArticleForm;
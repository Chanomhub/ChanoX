import React from 'react';
import {ArticleFormData} from './types/types.ts';
import ImageSelector from './ImageSelector';
import {useEditor, EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';


interface ArticleFormProps {
    formData: ArticleFormData;
    handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    handleFileSelect: (name: 'mainImageFile' | 'additionalImageFiles' | 'coverImageFile' | 'thumbnailImageFile') => Promise<void>;
    handleSubmit: () => Promise<void>;
    isLoading: boolean;
}

const ArticleForm: React.FC<ArticleFormProps> = ({
                                                     formData,
                                                     handleChange,
                                                     handleFileSelect,
                                                     handleSubmit,
                                                     isLoading,
                                                 }) => {
    // ตั้งค่า TipTap Editor สำหรับฟิลด์ body
    const editor = useEditor({
        extensions: [
            StarterKit as any,
        ],
        content: formData.body, // โหลดเนื้อหาเริ่มต้นจาก formData.body
        onUpdate: ({editor}) => {
            // อัปเดตค่า body ใน formData เมื่อมีการเปลี่ยนแปลงใน editor
            handleChange({
                target: {name: 'body', value: editor.getHTML()},
            } as React.ChangeEvent<HTMLTextAreaElement>);
        },
    });

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-2xl font-bold justify-center mb-6 text-base-content">
                    ✨ กรอกข้อมูลบทความ
                </h2>

                <form className="space-y-6">
                    {/* Main Content Section */}
                    <div className="space-y-8">
                        {/* Basic Information Section */}
                        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
                            <h3 className="text-xl font-semibold text-base-content mb-6 flex items-center gap-2">
                                <span
                                    className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-content text-sm">📋</span>
                                ข้อมูลพื้นฐาน
                            </h3>

                            <div className="space-y-6">
                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-base-content font-medium flex items-center gap-2">
                                            <span className="text-primary">📝</span> หัวข้อบทความ
                                        </span>
                                        <span className="badge badge-error badge-sm">จำเป็น</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="กรอกหัวข้อที่น่าสนใจ..."
                                        className="input input-bordered input-primary w-full"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-base-content font-medium flex items-center gap-2">
                                            <span className="text-success">📄</span> คำอธิบายสั้น
                                        </span>
                                        <span className="badge badge-error badge-sm">จำเป็น</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="เขียนคำอธิบายสั้นๆ ที่ดึงดูดความสนใจ..."
                                        className="textarea textarea-bordered textarea-primary w-full h-24 resize-none"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-base-content font-medium flex items-center gap-2">
                                            <span className="text-secondary">✍️</span> เนื้อหาบทความ
                                        </span>
                                        <span className="badge badge-error badge-sm">จำเป็น</span>
                                    </label>
                                    <div
                                        className="border-2 border-base-300 rounded-xl overflow-hidden bg-base-100 focus-within:border-primary transition-all duration-200">
                                        {/* Rich Text Editor Toolbar */}
                                        <div className="bg-base-200 p-3 border-b border-base-300">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().toggleMark('bold').run()}
                                                    className={`btn btn-sm ${
                                                        editor?.isActive('bold')
                                                            ? 'btn-primary'
                                                            : 'btn-ghost'
                                                    }`}
                                                    title="ตัวหนา"
                                                >
                                                    <strong>B</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().toggleMark('italic').run()}
                                                    className={`btn btn-sm ${
                                                        editor?.isActive('italic')
                                                            ? 'btn-primary'
                                                            : 'btn-ghost'
                                                    }`}
                                                    title="ตัวเอียง"
                                                >
                                                    <em>I</em>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().toggleNode('heading', 'paragraph', {level: 2}).run()}
                                                    className={`btn btn-sm ${
                                                        editor?.isActive('heading', {level: 2})
                                                            ? 'btn-primary'
                                                            : 'btn-ghost'
                                                    }`}
                                                    title="หัวข้อ"
                                                >
                                                    H2
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().toggleNode('bulletList', 'paragraph').run()}
                                                    className={`btn btn-sm ${
                                                        editor?.isActive('bulletList')
                                                            ? 'btn-primary'
                                                            : 'btn-ghost'
                                                    }`}
                                                    title="รายการ"
                                                >
                                                    •
                                                </button>
                                            </div>
                                        </div>

                                        {/* Editor Content */}
                                        <EditorContent
                                            editor={editor}
                                            className="p-4 min-h-[200px] prose max-w-none focus:outline-none text-base-content"
                                        />
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
        <span className="text-base-content font-medium flex items-center gap-2">
            <span className="text-warning">🔢</span> เวอร์ชัน
        </span>
                                        <span className="badge badge-ghost badge-sm">ไม่จำเป็น</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="ver"  // เปลี่ยนจาก "version" เป็น "ver"
                                        value={formData.ver}
                                        onChange={handleChange}
                                        placeholder="เช่น v1.0.0, v2.1.5"
                                        className="input input-bordered w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Information Section */}
                        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
                            <h3 className="text-xl font-semibold text-base-content mb-6 flex items-center gap-2">
                                <span
                                    className="w-8 h-8 bg-success rounded-lg flex items-center justify-center text-success-content text-sm">🏷️</span>
                                ข้อมูลเพิ่มเติม
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-base-content font-medium flex items-center gap-2">
                                            <span className="text-info">🏷️</span> แท็ก
                                        </span>
                                        <span className="badge badge-ghost badge-sm">คั่นด้วยคอมม่า</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="tagList"
                                        value={formData.tagList}
                                        onChange={handleChange}
                                        placeholder="React, JavaScript, TypeScript"
                                        className="input input-bordered input-info w-full"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-base-content font-medium flex items-center gap-2">
                                            <span className="text-secondary">📂</span> หมวดหมู่
                                        </span>
                                        <span className="badge badge-ghost badge-sm">คั่นด้วยคอมม่า</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="categoryList"
                                        value={formData.categoryList}
                                        onChange={handleChange}
                                        placeholder="เทคโนโลยี, บันเทิง, เกม"
                                        className="input input-bordered input-secondary w-full"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-base-content font-medium flex items-center gap-2">
                                            <span className="text-accent">💻</span> แพลตฟอร์ม
                                        </span>
                                        <span className="badge badge-ghost badge-sm">คั่นด้วยคอมม่า</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="platformList"
                                        value={formData.platformList}
                                        onChange={handleChange}
                                        placeholder="Windows, Mac, Linux, Android"
                                        className="input input-bordered input-accent w-full"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="flex items-center justify-between mb-2">
                                        <span className="text-base-content font-medium flex items-center gap-2">
                                            <span className="text-error">⚙️</span> Engine
                                        </span>
                                        <span className="badge badge-ghost badge-sm">ไม่จำเป็น</span>
                                    </label>
                                    <select
                                        name="engine"
                                        value={formData.engine || ''}
                                        onChange={handleChange}
                                        className="select select-bordered w-full"
                                    >
                                        <option value="">ไม่ระบุ</option>
                                        <option value="RENPY">Ren'Py</option>
                                        <option value="RPGM">RPG Maker</option>
                                        <option value="UNITY">Unity</option>
                                        <option value="UNREAL">Unreal Engine</option>
                                        <option value="TyranoBuilder">TyranoBuilder</option>
                                        <option value="WOLFRPG">Wolf RPG</option>
                                        <option value="KIRIKIRI">Kirikiri</option>
                                        <option value="Godot">Godot</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Image Upload Section */}
                        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
                            <h3 className="text-xl font-semibold text-base-content mb-6 flex items-center gap-2">
                                <span
                                    className="w-8 h-8 bg-warning rounded-lg flex items-center justify-center text-warning-content text-sm">🖼️</span>
                                รูปภาพประกอบ
                            </h3>

                            <div className="space-y-6">
                                <ImageSelector
                                    label="รูปภาพหลัก"
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
                                    label="รูปภาพเพิ่มเติม"
                                    imageUrl={formData.images}
                                    imagePaths={formData.additionalImageFiles}
                                    name="images"
                                    selectType="additionalImageFiles"
                                    handleChange={handleChange}
                                    handleFileSelect={handleFileSelect}
                                    placeholder="ระบุ URLs (คั่นด้วยคอมม่า)"
                                    isDisabled={formData.additionalImageFiles.length > 0}
                                    isMultiple={true}
                                />
                                <ImageSelector
                                    label="รูปภาพปก"
                                    imageUrl={formData.coverImage}
                                    imagePath={formData.coverImageFile} // Use coverImageFile for selected file path
                                    name="coverImage" // Fix name to match state field
                                    selectType="coverImageFile"
                                    handleChange={handleChange}
                                    handleFileSelect={handleFileSelect}
                                    placeholder="ระบุ URL ภาพปก"
                                    isDisabled={!!formData.coverImageFile} // Disable input if file is selected
                                />

                                <ImageSelector
                                    label="ภาพพื้นหลัง"
                                    imageUrl={formData.backgroundImage}
                                    imagePath={formData.thumbnailImageFile} // Use thumbnailImageFile for selected file path
                                    name="backgroundImage" // Fix name to match state field
                                    selectType="thumbnailImageFile"
                                    handleChange={handleChange}
                                    handleFileSelect={handleFileSelect}
                                    placeholder="ระบุ URL พื้นหลัง"
                                    isDisabled={!!formData.thumbnailImageFile} // Disable input if file is selected
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="card-actions justify-center pt-6">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className={`btn btn-primary btn-wide btn-lg ${
                                isLoading ? 'loading' : ''
                            }`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    กำลังส่ง...
                                </>
                            ) : (
                                <>
                                    ✨ สร้างบทความ
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ArticleForm;
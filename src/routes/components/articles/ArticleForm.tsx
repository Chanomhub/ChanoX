import React from 'react';
import { ArticleFormData } from './types';
import ImageSelector from './ImageSelector';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface ArticleFormProps {
    formData: ArticleFormData;
    handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    handleFileSelect: (name: 'mainImageFile' | 'additionalImageFiles') => Promise<void>;
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
            StarterKit, // ใช้ StarterKit เพื่อรวมฟีเจอร์พื้นฐาน
        ],
        content: formData.body, // โหลดเนื้อหาเริ่มต้นจาก formData.body
        onUpdate: ({ editor }) => {
            // อัปเดตค่า body ใน formData เมื่อมีการเปลี่ยนแปลงใน editor
            handleChange({
                target: { name: 'body', value: editor.getHTML() },
            } as React.ChangeEvent<HTMLTextAreaElement>);
        },
    });

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-2xl font-bold justify-center mb-6">
                    ✨ กรอกข้อมูลบทความ
                </h2>

                <form className="space-y-6">
                    {/* Main Content Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Main Info */}
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">📝 หัวข้อ</span>
                                    <span className="label-text-alt text-error">*จำเป็น</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="กรอกหัวข้อบทความ"
                                    className="input input-bordered w-full focus:input-primary"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">📄 คำอธิบาย</span>
                                    <span className="label-text-alt text-error">*จำเป็น</span>
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="คำอธิบายบทความ"
                                    className="textarea textarea-bordered h-20 resize-none focus:textarea-primary"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">📝 เนื้อหา</span>
                                    <span className="label-text-alt text-error">*จำเป็น</span>
                                </label>
                                <div className="border border-base-300 rounded-lg overflow-hidden">
                                    {/* Rich Text Editor Toolbar */}
                                    <div className="bg-base-200 p-2 border-b border-base-300">
                                        <div className="btn-group">
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleBold().run()}
                                                className={`btn btn-sm ${
                                                    editor?.isActive('bold') ? 'btn-primary' : 'btn-ghost'
                                                }`}
                                                title="ตัวหนา"
                                            >
                                                <strong>B</strong>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleItalic().run()}
                                                className={`btn btn-sm ${
                                                    editor?.isActive('italic') ? 'btn-primary' : 'btn-ghost'
                                                }`}
                                                title="ตัวเอียง"
                                            >
                                                <em>I</em>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                                className={`btn btn-sm ${
                                                    editor?.isActive('heading', { level: 2 }) ? 'btn-primary' : 'btn-ghost'
                                                }`}
                                                title="หัวข้อ"
                                            >
                                                H2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                                className={`btn btn-sm ${
                                                    editor?.isActive('bulletList') ? 'btn-primary' : 'btn-ghost'
                                                }`}
                                                title="ลิสต์"
                                            >
                                                •
                                            </button>
                                        </div>
                                    </div>

                                    {/* Editor Content */}
                                    <EditorContent
                                        editor={editor}
                                        className="p-4 min-h-[200px] prose max-w-none focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">🔢 เวอร์ชัน</span>
                                    <span className="label-text-alt">ไม่จำเป็น</span>
                                </label>
                                <input
                                    type="text"
                                    name="version"
                                    value={formData.version}
                                    onChange={handleChange}
                                    placeholder="ตัวอย่าง: 1.32"
                                    className="input input-bordered focus:input-primary"
                                />
                            </div>
                        </div>

                        {/* Right Column - Additional Info */}
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">🏷️ แท็ก</span>
                                    <span className="label-text-alt">คั่นด้วยคอมม่า</span>
                                </label>
                                <input
                                    type="text"
                                    name="tagList"
                                    value={formData.tagList}
                                    onChange={handleChange}
                                    placeholder="React, JavaScript, TypeScript"
                                    className="input input-bordered focus:input-primary"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">📂 หมวดหมู่</span>
                                    <span className="label-text-alt">คั่นด้วยคอมม่า</span>
                                </label>
                                <input
                                    type="text"
                                    name="categoryList"
                                    value={formData.categoryList}
                                    onChange={handleChange}
                                    placeholder="เทคโนโลยี, บันเทิง, เกม"
                                    className="input input-bordered focus:input-primary"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">💻 แพลตฟอร์ม</span>
                                    <span className="label-text-alt">คั่นด้วยคอมม่า</span>
                                </label>
                                <input
                                    type="text"
                                    name="platformList"
                                    value={formData.platformList}
                                    onChange={handleChange}
                                    placeholder="Windows, Mac, Linux, Android"
                                    className="input input-bordered focus:input-primary"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">⚙️ Engine</span>
                                    <span className="label-text-alt">ไม่จำเป็น</span>
                                </label>
                                <select
                                    name="engine"
                                    value={formData.engine || ''}
                                    onChange={handleChange}
                                    className="select select-bordered focus:select-primary"
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

                            {/* Image Upload Section */}
                            <div className="divider">🖼️ รูปภาพ</div>

                            <div className="space-y-4 bg-base-50 p-4 rounded-lg">
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
import React from 'react';
import {ArticleFormData} from './types/types.ts';
import ImageSelector from './ImageSelector';
import {useEditor, EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

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
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false, // ปิดใช้งาน default code block เพื่อใช้ lowlight แทน
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary hover:text-primary-focus underline',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full h-auto rounded-lg',
                },
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.configure({
                lowlight,
                HTMLAttributes: {
                    class: 'bg-base-300 rounded-lg p-4 text-sm',
                },
            }),
        ],
        content: formData.body,
        onUpdate: ({editor}) => {
            handleChange({
                target: {name: 'body', value: editor.getHTML()},
            } as React.ChangeEvent<HTMLTextAreaElement>);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
            },
        },
    });

    const addLink = () => {
        const url = window.prompt('กรอก URL:');
        if (url) {
            editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    };

    const addImage = () => {
        const url = window.prompt('กรอก URL รูปภาพ:');
        if (url) {
            editor?.chain().focus().setImage({ src: url }).run();
        }
    };

    const insertTable = () => {
        editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    const ToolbarButton = ({
                               onClick,
                               isActive = false,
                               disabled = false,
                               title,
                               children
                           }: {
        onClick: () => void;
        isActive?: boolean;
        disabled?: boolean;
        title: string;
        children: React.ReactNode;
    }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`btn btn-sm tooltip ${
                isActive
                    ? 'btn-primary'
                    : 'btn-ghost hover:btn-ghost-focus'
            } ${disabled ? 'btn-disabled' : ''}`}
            data-tip={title}
        >
            {children}
        </button>
    );

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
                                    <div className="border-2 border-base-300 rounded-xl overflow-hidden bg-base-100 focus-within:border-primary transition-all duration-200">
                                        {/* Enhanced Rich Text Editor Toolbar */}
                                        <div className="bg-base-200 p-3 border-b border-base-300">
                                            <div className="flex flex-wrap gap-2">
                                                {/* Text Formatting */}
                                                <div className="flex gap-1 border-r border-base-300 pr-2">
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleBold().run()}
                                                        isActive={editor?.isActive('bold')}
                                                        title="ตัวหนา (Ctrl+B)"
                                                    >
                                                        <strong>B</strong>
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                                                        isActive={editor?.isActive('italic')}
                                                        title="ตัวเอียง (Ctrl+I)"
                                                    >
                                                        <em>I</em>
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                                                        isActive={editor?.isActive('underline')}
                                                        title="ขีดเส้นใต้ (Ctrl+U)"
                                                    >
                                                        <u>U</u>
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleStrike().run()}
                                                        isActive={editor?.isActive('strike')}
                                                        title="ขีดทับ"
                                                    >
                                                        <s>S</s>
                                                    </ToolbarButton>
                                                </div>

                                                {/* Headings */}
                                                <div className="flex gap-1 border-r border-base-300 pr-2">
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                                                        isActive={editor?.isActive('heading', { level: 1 })}
                                                        title="หัวข้อใหญ่"
                                                    >
                                                        H1
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                                        isActive={editor?.isActive('heading', { level: 2 })}
                                                        title="หัวข้อกลาง"
                                                    >
                                                        H2
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                                                        isActive={editor?.isActive('heading', { level: 3 })}
                                                        title="หัวข้อเล็ก"
                                                    >
                                                        H3
                                                    </ToolbarButton>
                                                </div>

                                                {/* Text Alignment */}
                                                <div className="flex gap-1 border-r border-base-300 pr-2">
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                                                        isActive={editor?.isActive({ textAlign: 'left' })}
                                                        title="จัดซ้าย"
                                                    >
                                                        ◀
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                                                        isActive={editor?.isActive({ textAlign: 'center' })}
                                                        title="จัดกลาง"
                                                    >
                                                        ▪
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                                                        isActive={editor?.isActive({ textAlign: 'right' })}
                                                        title="จัดขวา"
                                                    >
                                                        ▶
                                                    </ToolbarButton>
                                                </div>

                                                {/* Lists */}
                                                <div className="flex gap-1 border-r border-base-300 pr-2">
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                                        isActive={editor?.isActive('bulletList')}
                                                        title="รายการแบบจุด"
                                                    >
                                                        •
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                                        isActive={editor?.isActive('orderedList')}
                                                        title="รายการแบบตัวเลข"
                                                    >
                                                        1.
                                                    </ToolbarButton>
                                                </div>

                                                {/* Highlighting */}
                                                <div className="flex gap-1 border-r border-base-300 pr-2">
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
                                                        isActive={editor?.isActive('highlight')}
                                                        title="ไฮไลต์"
                                                    >
                                                        🖍️
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleCode().run()}
                                                        isActive={editor?.isActive('code')}
                                                        title="โค้ดในบรรทัด"
                                                    >
                                                        &lt;/&gt;
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                                                        isActive={editor?.isActive('codeBlock')}
                                                        title="บล็อกโค้ด"
                                                    >
                                                        {'{ }'}
                                                    </ToolbarButton>
                                                </div>

                                                {/* Advanced Features */}
                                                <div className="flex gap-1">
                                                    <ToolbarButton
                                                        onClick={addLink}
                                                        isActive={editor?.isActive('link')}
                                                        title="เพิ่มลิงก์"
                                                    >
                                                        🔗
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={addImage}
                                                        title="เพิ่มรูปภาพ"
                                                    >
                                                        🖼️
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={insertTable}
                                                        title="เพิ่มตาราง"
                                                    >
                                                        📊
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                                                        title="เส้นคั่น"
                                                    >
                                                        ➖
                                                    </ToolbarButton>
                                                </div>

                                                {/* Undo/Redo */}
                                                <div className="flex gap-1 border-l border-base-300 pl-2 ml-auto">
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().undo().run()}
                                                        disabled={!editor?.can().undo()}
                                                        title="ยกเลิก (Ctrl+Z)"
                                                    >
                                                        ↶
                                                    </ToolbarButton>
                                                    <ToolbarButton
                                                        onClick={() => editor?.chain().focus().redo().run()}
                                                        disabled={!editor?.can().redo()}
                                                        title="ทำซ้ำ (Ctrl+Y)"
                                                    >
                                                        ↷
                                                    </ToolbarButton>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Editor Content */}
                                        <EditorContent
                                            editor={editor}
                                            className="p-4 min-h-[300px] max-w-none focus:outline-none text-base-content"
                                        />
                                    </div>

                                    {/* Table Controls (แสดงเมื่อเลือกตาราง) */}
                                    {editor?.isActive('table') && (
                                        <div className="bg-base-300 p-3 rounded-lg mt-2">
                                            <div className="flex gap-2 flex-wrap">
                                                <span className="text-sm font-medium">ตาราง:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().addColumnBefore().run()}
                                                    className="btn btn-xs btn-ghost"
                                                >
                                                    + คอลัมน์ซ้าย
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().addColumnAfter().run()}
                                                    className="btn btn-xs btn-ghost"
                                                >
                                                    + คอลัมน์ขวา
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().addRowBefore().run()}
                                                    className="btn btn-xs btn-ghost"
                                                >
                                                    + แถวบน
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().addRowAfter().run()}
                                                    className="btn btn-xs btn-ghost"
                                                >
                                                    + แถวล่าง
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().deleteColumn().run()}
                                                    className="btn btn-xs btn-error"
                                                >
                                                    ลบคอลัมน์
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().deleteRow().run()}
                                                    className="btn btn-xs btn-error"
                                                >
                                                    ลบแถว
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => editor?.chain().focus().deleteTable().run()}
                                                    className="btn btn-xs btn-error"
                                                >
                                                    ลบตาราง
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                        name="ver"
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
                                    imagePath={formData.coverImageFile}
                                    name="coverImage"
                                    selectType="coverImageFile"
                                    handleChange={handleChange}
                                    handleFileSelect={handleFileSelect}
                                    placeholder="ระบุ URL ภาพปก"
                                    isDisabled={!!formData.coverImageFile}
                                />

                                <ImageSelector
                                    label="ภาพพื้นหลัง"
                                    imageUrl={formData.backgroundImage}
                                    imagePath={formData.thumbnailImageFile}
                                    name="backgroundImage"
                                    selectType="thumbnailImageFile"
                                    handleChange={handleChange}
                                    handleFileSelect={handleFileSelect}
                                    placeholder="ระบุ URL พื้นหลัง"
                                    isDisabled={!!formData.thumbnailImageFile}
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
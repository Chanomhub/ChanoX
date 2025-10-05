import React from 'react';
import { ArticleFormData } from './types/types.ts';
import { useEditor, EditorContent } from '@tiptap/react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2, Image as ImageIcon, Table as TableIcon, Minus, Undo, Redo, Code as CodeIcon, Quote, Highlighter } from "lucide-react";

// Replace StarterKit with individual extensions
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import BoldExt from '@tiptap/extension-bold';
import ItalicExt from '@tiptap/extension-italic';
import StrikeExt from '@tiptap/extension-strike';
import CodeExt from '@tiptap/extension-code';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import HardBreak from '@tiptap/extension-hard-break';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import History from '@tiptap/extension-history';

// Your other extensions
import UnderlineExt from '@tiptap/extension-underline';
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
            Document, Paragraph, Text, BoldExt, ItalicExt, StrikeExt, CodeExt, Heading, BulletList, OrderedList, ListItem, Blockquote, HorizontalRule, HardBreak, Dropcursor, Gapcursor, History, UnderlineExt, TextStyle, Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary hover:text-primary-focus underline' } }),
            Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' } }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            CodeBlockLowlight.configure({ lowlight, HTMLAttributes: { class: 'bg-base-300 rounded-lg p-4 text-sm' } }),
        ],
        content: formData.body,
        onUpdate: ({ editor }) => {
            handleChange({ target: { name: 'body', value: editor.getHTML() } } as React.ChangeEvent<HTMLTextAreaElement>);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4 min-h-[300px] max-w-none',
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold justify-center mb-6">✨ กรอกข้อมูลบทความ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="title">หัวข้อบทความ</Label>
                        <Input id="title" name="title" value={formData.title} onChange={handleChange} placeholder="กรอกหัวข้อที่น่าสนใจ..." required />
                    </div>
                    <div>
                        <Label htmlFor="description">คำอธิบายสั้น</Label>
                        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="เขียนคำอธิบายสั้นๆ ที่ดึงดูดความสนใจ..." required />
                    </div>
                    <div>
                        <Label>เนื้อหาบทความ</Label>
                        <div className="border rounded-md">
                            <div className="p-2 border-b flex flex-wrap items-center gap-2">
                                <ToggleGroup type="multiple" size="sm">
                                    <Toggle pressed={editor?.isActive('bold')} onPressedChange={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Toggle>
                                    <Toggle pressed={editor?.isActive('italic')} onPressedChange={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Toggle>
                                    <Toggle pressed={editor?.isActive('underline')} onPressedChange={() => editor?.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></Toggle>
                                    <Toggle pressed={editor?.isActive('strike')} onPressedChange={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Toggle>
                                </ToggleGroup>
                                <ToggleGroup type="single" size="sm" defaultValue="paragraph">
                                    <ToggleGroupItem value="h1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToggleGroupItem>
                                    <ToggleGroupItem value="h2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToggleGroupItem>
                                    <ToggleGroupItem value="h3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToggleGroupItem>
                                </ToggleGroup>
                                <ToggleGroup type="single" size="sm" defaultValue="left">
                                    <ToggleGroupItem value="left" onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
                                    <ToggleGroupItem value="center" onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
                                    <ToggleGroupItem value="right" onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></ToggleGroupItem>
                                </ToggleGroup>
                                <ToggleGroup type="multiple" size="sm">
                                    <Toggle pressed={editor?.isActive('bulletList')} onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Toggle>
                                    <Toggle pressed={editor?.isActive('orderedList')} onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Toggle>
                                    <Toggle pressed={editor?.isActive('blockquote')} onPressedChange={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Toggle>
                                </ToggleGroup>
                                <ToggleGroup type="multiple" size="sm">
                                    <Toggle pressed={editor?.isActive('code')} onPressedChange={() => editor?.chain().focus().toggleCode().run()}><CodeIcon className="h-4 w-4" /></Toggle>
                                    <Toggle pressed={editor?.isActive('highlight')} onPressedChange={() => editor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}><Highlighter className="h-4 w-4" /></Toggle>
                                </ToggleGroup>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={addLink}><Link2 className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={addImage}><ImageIcon className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={insertTable}><TableIcon className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Button>
                                </div>
                                <div className="flex gap-1 ml-auto">
                                    <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()}><Undo className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()}><Redo className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="ver">เวอร์ชัน</Label>
                        <Input id="ver" name="ver" value={formData.ver} onChange={handleChange} placeholder="เช่น v1.0.0, v2.1.5" />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>ข้อมูลเพิ่มเติม</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="tagList">แท็ก</Label>
                            <Input id="tagList" name="tagList" value={formData.tagList} onChange={handleChange} placeholder="React, JavaScript, TypeScript" />
                        </div>
                        <div>
                            <Label htmlFor="categoryList">หมวดหมู่</Label>
                            <Input id="categoryList" name="categoryList" value={formData.categoryList} onChange={handleChange} placeholder="เทคโนโลยี, บันเทิง, เกม" />
                        </div>
                        <div>
                            <Label htmlFor="platformList">แพลตฟอร์ม</Label>
                            <Input id="platformList" name="platformList" value={formData.platformList} onChange={handleChange} placeholder="Windows, Mac, Linux, Android" />
                        </div>
                        <div>
                            <Label htmlFor="engine">Engine</Label>
                            <Select name="engine" value={formData.engine || 'none'} onValueChange={(value) => handleChange({ target: { name: 'engine', value: value === 'none' ? '' : value } } as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="ไม่ระบุ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">ไม่ระบุ</SelectItem>
                                    <SelectItem value="RENPY">Ren'Py</SelectItem>
                                    <SelectItem value="RPGM">RPG Maker</SelectItem>
                                    <SelectItem value="UNITY">Unity</SelectItem>
                                    <SelectItem value="UNREAL">Unreal Engine</SelectItem>
                                    <SelectItem value="TyranoBuilder">TyranoBuilder</SelectItem>
                                    <SelectItem value="WOLFRPG">Wolf RPG</SelectItem>
                                    <SelectItem value="KIRIKIRI">Kirikiri</SelectItem>
                                    <SelectItem value="Godot">Godot</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>รูปภาพประกอบ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label>รูปภาพหลัก</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => handleFileSelect('mainImageFile')}>เลือกรูปภาพ</Button>
                                <Input name="mainImage" value={formData.mainImage} onChange={handleChange} disabled={!!formData.mainImageFile} placeholder="ระบุ URL หรือเลือกไฟล์" required />
                            </div>
                            {formData.mainImageFile && <p className="text-xs text-gray-500">Selected: {formData.mainImageFile}</p>}
                        </div>
                        <div>
                            <Label>รูปภาพเพิ่มเติม</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => handleFileSelect('additionalImageFiles')}>เลือกรูปภาพเพิ่มเติม</Button>
                                <Input name="images" value={formData.images} onChange={handleChange} disabled={formData.additionalImageFiles.length > 0} placeholder="ระบุ URLs (คั่นด้วยคอมม่า)" />
                            </div>
                            {formData.additionalImageFiles.length > 0 && (
                                <ul className="text-xs text-gray-500 list-disc list-inside">
                                    {formData.additionalImageFiles.map((file, index) => (
                                        <li key={index}>{file}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <Label>รูปภาพปก</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => handleFileSelect('coverImageFile')}>เลือกรูปภาพ</Button>
                                <Input name="coverImage" value={formData.coverImage} onChange={handleChange} disabled={!!formData.coverImageFile} placeholder="ระบุ URL ภาพปก" />
                            </div>
                            {formData.coverImageFile && <p className="text-xs text-gray-500">Selected: {formData.coverImageFile}</p>}
                        </div>
                        <div>
                            <Label>ภาพพื้นหลัง</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => handleFileSelect('thumbnailImageFile')}>เลือกรูปภาพ</Button>
                                <Input name="backgroundImage" value={formData.backgroundImage} onChange={handleChange} disabled={!!formData.thumbnailImageFile} placeholder="ระบุ URL พื้นหลัง" />
                            </div>
                            {formData.thumbnailImageFile && <p className="text-xs text-gray-500">Selected: {formData.thumbnailImageFile}</p>}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-center pt-6">
                    <Button type="button" onClick={handleSubmit} disabled={isLoading} size="lg">
                        {isLoading ? 'กำลังส่ง...' : 'สร้างบทความ'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ArticleForm;
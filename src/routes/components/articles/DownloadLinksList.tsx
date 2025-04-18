
import React from 'react';

interface DownloadLinksListProps {
    links: any[];
}

const DownloadLinksList: React.FC<DownloadLinksListProps> = ({ links }) => {
    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">ลิงค์ดาวน์โหลดที่สร้างแล้ว</h3>
            <ul className="list-disc list-inside">
                {links.map((link, index) => (
                    <li key={index}>
                        {link.name}: <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.url}</a>{' '}
                        {link.isActive ? '(แอคทีฟ)' : '(ไม่แอคทีฟ)'}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DownloadLinksList;
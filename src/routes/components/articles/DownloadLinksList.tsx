import React from 'react';

interface Link {
    name: string;
    url: string;
    isActive: boolean;
}

interface DownloadLinksListProps {
    links: Link[];
}

const DownloadLinksList: React.FC<DownloadLinksListProps> = ({ links }) => {
    if (!Array.isArray(links) || links.length === 0) {
        return (
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">ลิงค์ดาวน์โหลดที่สร้างแล้ว</h3>
                <p className="text-red-500">ไม่มีลิงค์ให้แสดง หรือข้อมูลไม่ถูกต้อง</p>
            </div>
        );
    }

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">ลิงค์ดาวน์โหลดที่สร้างแล้ว</h3>
            <ul className="list-disc list-inside">
                {links.map((link, index) => {
                    if (!link.name || !link.url) {
                        return (
                            <li key={index} className="text-red-500">
                                ลิงค์ที่ {index + 1}: ข้อมูลไม่ครบถ้วน
                            </li>
                        );
                    }

                    return (
                        <li key={index}>
                            {link.name}: <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.url}</a>{' '}
                            {link.isActive ? '(Active)' : '(Inactive)'}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

interface JsonDownloadLinksListProps {
    jsonString: string;
}

const JsonDownloadLinksList: React.FC<JsonDownloadLinksListProps> = ({ jsonString }) => {
    let links: Link[] | null = null;
    try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
            links = parsed;
        }
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }

    if (!links) {
        return (
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">ลิงค์ดาวน์โหลดที่สร้างแล้ว</h3>
                <p className="text-red-500">JSON ไม่ถูกต้องหรือไม่มีข้อมูล</p>
            </div>
        );
    }

    return <DownloadLinksList links={links} />;
};

export { DownloadLinksList, JsonDownloadLinksList };
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DownloadLinksListProps {
    links: any[];
}

const DownloadLinksList: React.FC<DownloadLinksListProps> = ({ links }) => {
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>ลิงค์ดาวน์โหลดที่สร้างแล้ว</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {links.map((link, index) => (
                        <li key={index} className="flex items-center justify-between">
                            <span>
                                {link.name}: <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.url}</a>
                            </span>
                            <Badge variant={link.isActive ? 'default' : 'destructive'}>{link.isActive ? 'Active' : 'Inactive'}</Badge>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

export default DownloadLinksList;
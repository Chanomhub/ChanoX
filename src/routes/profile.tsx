// src/routes/profile.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ProfileData } from "./types/types"; // Adjust the import path as necessary


const Profile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get(
                    `https://api.chanomhub.online/api/profiles/${username}`,
                    {
                        headers: {
                            accept: "application/json",
                        },
                    }
                );
                setProfile(response.data.profile);
                setLoading(false);
            } catch (err) {
                setError("Failed to load profile");
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    if (error || !profile) {
        return <div className="p-4 text-red-500">{error || "Profile not found"}</div>;
    }

    return (
        <div className="w-full h-screen overflow-y-auto">
            {/* Background Image */}
            <div
                className="w-full h-64 bg-cover bg-center"
                style={{ backgroundImage: `url(${profile.backgroundImage})` }}
            ></div>

            {/* Profile Content */}
            <div className="max-w-4xl mx-auto px-4 -mt-16">
                {/* Profile Image */}
                <img
                    src={profile.image}
                    alt={`${profile.username}'s profile`}
                    className="w-32 h-32 rounded-full border-4 border-base-200"
                />

                {/* Username and Bio */}
                <h1 className="text-3xl font-bold mt-4">{profile.username}</h1>
                <p className="text-base-content/80 mt-2">{profile.bio || "No bio available"}</p>

                {/* Social Media Links */}
                <div className="mt-4 flex gap-4">
                    {profile.socialMediaLinks.map((link) => (
                        <a
                            key={link.platform}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            {link.platform}
                        </a>
                    ))}
                </div>

                {/* Following Status */}
                <div className="mt-4">
                    <span
                        className={`px-3 py-1 rounded-full text-sm ${
                            profile.following ? "bg-green-500" : "bg-gray-500"
                        } text-white`}
                    >
                        {profile.following ? "Following" : "Not Following"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Profile;
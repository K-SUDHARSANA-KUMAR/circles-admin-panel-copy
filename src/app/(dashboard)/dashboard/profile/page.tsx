'use client';

import React from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { IconUser, IconMail, IconCircleCheck } from '@tabler/icons-react';

const ProfilePage = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Dummy data for missing fields
  const profileData = {
    bio: "Passionate professional dedicated to excellence in operations and management. Experienced in handling complex logistics and ensuring seamless service delivery.",
    dob: "May 15, 1992",
    reliabilityScore: 98,
    phoneNumber: user?.phoneNumber || "+91 98765 43210",
    email: user?.email || "user@thecirclesclub.com",
    name: user?.name || "User Name",
    interests: [
      { name: "Cricket", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      { name: "Singing", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
      { name: "Anime", color: "bg-pink-500/10 text-pink-500 border-pink-500/20" },
      { name: "Sports", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
      { name: "Fishing", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
      { name: "Manga", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    ]
  };

  return (
    <div className="flex flex-col p-6 gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      {/* Section 1: Profile Information */}
      <section id="profile-info" className="min-h-[80vh] flex flex-col gap-6">
        <div className="flex justify-between items-start w-full relative">
          <div className="flex flex-col gap-1">
            <Link 
              href="/dashboard/overview"
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline mb-2 cursor-pointer"
            >
              ← Back to Overview
            </Link>
            <h1 className="text-4xl font-extrabold text-glow tracking-tight">User Profile</h1>
          </div>
          
          {/* Reliability Score Circle */}
          {/* <div className="absolute top-0 right-0 group">
           <div className="relative h-24 w-24 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-zinc-200 dark:text-zinc-800"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - profileData.reliabilityScore / 100)}
                strokeLinecap="round"
                className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold">{profileData.reliabilityScore}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Score</span>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-zinc-900 text-white text-[10px] px-2 py-1 rounded pointer-events-none">
            Reliability Score
          </div>
        </div> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        {/* Left Column: Avatar & Bio */}
        <div className="lg:col-span-4 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-48 w-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-2xl overflow-hidden glass-card p-1">
              <div className="h-full w-full rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-6xl font-bold text-primary">
                {profileData.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="absolute bottom-2 right-4 h-8 w-8 bg-primary rounded-full border-4 border-white dark:border-zinc-900 flex items-center justify-center text-white shadow-lg pointer-events-none">
              <IconCircleCheck size={16} stroke={3} />
            </div>
          </div>

          {/* <Card className="p-6 glass-card border-none shadow-xl w-full">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Bio</h3>
            <p className="text-foreground/80 leading-relaxed text-sm italic">
              "{profileData.bio}"
            </p>
          </Card> */}
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-8">
          <Card className="glass-card border-none shadow-2xl overflow-hidden">
            {/* <div className="bg-primary/5 p-6 border-b border-primary/10">
              <h2 className="text-xl font-bold">Personal Information</h2>
              <p className="text-xs text-muted-foreground mt-1">Manage your personal details and contact information</p>
            </div> */}
            
            <div className="p-8 grid gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Name */}
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-primary/5 transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <IconUser size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</p>
                    <p className="text-lg font-semibold mt-1">{profileData.name}</p>
                  </div>
                </div>

                {/* DOB */}
                {/* <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-primary/5 transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <IconCalendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</p>
                    <p className="text-lg font-semibold mt-1">{profileData.dob}</p>
                  </div>
                </div> */}

                {/* Phone */}
                {/* <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-primary/5 transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <IconPhone size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</p>
                    <p className="text-lg font-semibold mt-1">{profileData.phoneNumber}</p>
                  </div>
                </div> */}

                {/* Email */}
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-primary/5 transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <IconMail size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</p>
                    <p className="text-lg font-semibold mt-1">{profileData.email}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-primary/10" />
              
              {/* <div className="flex justify-end gap-3">
                <button className="px-6 py-2 rounded-lg bg-primary text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                  Edit Profile
                </button>
              </div> */}
            </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 2: Interest */}
      {/* <section id="interests" className="min-h-[60vh] mt-12 pt-12 border-t border-primary/10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
        <h3 className="text-3xl font-black mb-8 flex items-center gap-4">
          <span className="h-10 w-2 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
          INTERESTS
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {profileData.interests.map((interest, index) => (
            <div 
              key={index}
              className={`flex items-center justify-center gap-3 px-6 py-5 rounded-3xl border ${interest.color} font-black text-sm uppercase tracking-tighter transition-all duration-500 hover:scale-110 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-2`}
            >
              {interest.name}
            </div>
          ))}
        </div>
      </section> */}
    </div>
  );
};

export default ProfilePage;

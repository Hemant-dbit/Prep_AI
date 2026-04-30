"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Mic,
  BookOpen,
  Target,
  Upload,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "../../client/context/AuthContext";
import { useUsageStats } from "@/client/hooks/useUsageStats";
import { useState } from "react";

export default function LeftPanel() {
  const pathName = usePathname() || "/";
  const router = useRouter();
  const { user, logout } = useAuth();
  console.log(user);
  const { usage, loading: usageLoading } = useUsageStats();

  type NavItemProps = {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    href?: string;
    badge?: string;
  };

  const NavItem = ({ icon: Icon, label, href, badge }: NavItemProps) => {
    const isActive = href ? pathName.startsWith(href) : false;

    const content = (
      <div
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full  ${
          isActive
            ? "bg-black text-white shadow-lg"
            : "text-gray-600 hover:bg-gray-200 "
        }`}
      >
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200  group-hover:bg-black ${
            isActive ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700 "
          }`}
        >
          <Icon className="w-4 h-4 text-current group-hover:text-white" />
        </div>
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              isActive ? "bg-white text-black" : "bg-black text-white"
            }`}
          >
            {badge}
          </span>
        )}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
      </div>
    );

    return href ? (
      <Link href={href} className="block">
        {content}
      </Link>
    ) : (
      <div>{content}</div>
    );
  };

  type LibraryItemProps = {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    href?: string;
  };

  const LibraryItem = ({ icon: Icon, label, href }: LibraryItemProps) => {
    const content = (
      <div className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200  transition-all duration-200 w-full cursor-pointer">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 group-hover:bg-black transition-colors duration-200 text-gray-700 group-hover:text-white">
          <Icon className="w-3.5 h-3.5 text-current" />
        </div>
        <span className="flex-1 text-left">{label}</span>
      </div>
    );

    return href ? (
      <Link href={href} className="block">
        {content}
      </Link>
    ) : (
      <div>{content}</div>
    );
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    router.push("/login");
    setShowLogoutConfirm(false);
  };

  return (
    <aside className="w-72 h-screen sticky top-0 bg-gray-100 border-r border-gray-200 flex flex-col">
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3 ">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg">
              <Compass className="w-5 h-5 text-white " />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-black rounded-full" />
          </div>
          <div>
            <div className="text-lg font-bold text-black">PrepAI</div>
            <div className="text-xs text-gray-500 font-medium">
              Interview Coach
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1  px-4 py-6 space-y-8">
        {/* Primary Navigation */}
        <nav>
          {/* <div className="flex items-center gap-2 px-2 mb-3">
            <Sparkles className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Practice
            </span>
          </div> */}
          <div className="space-y-1">
            <NavItem
              icon={Mic}
              label="AI Interviews"
              href="/home/dashboard"
              badge="New"
            />
            <NavItem
              icon={BookOpen}
              label="Question Bank"
              href="/home/questions"
            />
          </div>
        </nav>

        {/* Insights Section */}
        <div>
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-1 h-4 bg-black rounded-full" />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Insights
            </span>
          </div>
          <NavItem icon={Target} label="Goals & Progress" href="/home/goals" />
        </div>

        {/* Library Section */}
        <div>
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-1 h-4 bg-black rounded-full" />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Library
            </span>
          </div>
          <div className="space-y-1">
            <NavItem
              icon={Upload}
              label="Upload Resume"
              href="/home/upload-resume"
            />
            {/* <LibraryItem icon={Bookmark} label="Bookmarks" />
            <LibraryItem icon={MessageSquare} label="Feedback History" /> */}
          </div>
        </div>
      </div>

      {/* Usage Card */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Usage
            </span>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-black text-white shadow-sm">
              {user?.isPremium ? "Pro " : "Free plan"}
            </span>
          </div>

          {/* Interviews Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">
                AI Interviews
              </span>
              <span className="text-xs font-bold text-black">
                {usageLoading
                  ? "..."
                  : `${usage?.interviews.used || 0}/${
                      usage?.interviews.limit || 4
                    }`}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-500"
                style={{ width: `${usage?.interviews.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Resume Checks Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">
                Resume Checks
              </span>
              <span className="text-xs font-bold text-black">
                {usageLoading
                  ? "..."
                  : `${usage?.resumes.used || 0}/${usage?.resumes.limit || 6}`}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-700 rounded-full transition-all duration-500"
                style={{ width: `${usage?.resumes.percentage || 0}%` }}
              />
            </div>
          </div>

          {user?.isPremium ? (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-600 rounded-xl py-2.5 text-sm font-semibold shadow-md cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Pro Activated
            </button>
          ) : (
            <Link href="/pricing">
              <button className="w-full bg-black hover:bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer">
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                Upgrade to Pro
              </button>
            </Link>
          )}
        </div>
      </div>
      {/* Profile Footer (profile link + logout) */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/home/profile" className="flex-1 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black text-white">
              <User className="w-5 h-5 " />
            </div>
            <div className="text-sm text-left">
              <div className="font-medium text-black">
                {user?.name ?? user?.email ?? "Profile"}
              </div>
              <div className="text-xs text-gray-500">View profile</div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="ml-2 p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            aria-label="Log out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Confirm Logout
              </h2>
              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to log out from your account?
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  You will need to log in again to access your account.
                </p>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

"use client";

interface AuthPageContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const maxWidthStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export default function AuthPageContainer({
  children,
  maxWidth = "md",
}: AuthPageContainerProps) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className={`w-full ${maxWidthStyles[maxWidth]}`}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-900/50 p-8 border border-gray-100 dark:border-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
}

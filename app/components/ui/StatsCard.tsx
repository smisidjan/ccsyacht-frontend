import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const cardStyles = {
  default: "bg-white dark:bg-gray-800",
  primary: "bg-gradient-to-br from-blue-500 to-blue-600",
  success: "bg-gradient-to-br from-green-500 to-green-600",
  warning: "bg-gradient-to-br from-amber-500 to-amber-600",
  danger: "bg-gradient-to-br from-red-500 to-red-600",
};

const textStyles = {
  default: {
    title: "text-gray-600 dark:text-gray-400",
    value: "text-gray-900 dark:text-white",
    icon: "text-gray-400",
  },
  primary: {
    title: "text-blue-100",
    value: "text-white",
    icon: "text-blue-100",
  },
  success: {
    title: "text-green-100",
    value: "text-white",
    icon: "text-green-100",
  },
  warning: {
    title: "text-amber-100",
    value: "text-white",
    icon: "text-amber-100",
  },
  danger: {
    title: "text-red-100",
    value: "text-white",
    icon: "text-red-100",
  },
};

export default function StatsCard({
  title,
  value,
  icon,
  description,
  variant = "default",
  className = "",
}: StatsCardProps) {
  const isGradient = variant !== "default";
  const styles = textStyles[variant];

  return (
    <div
      className={`${cardStyles[variant]} rounded-2xl shadow-lg p-6 ${isGradient ? "text-white" : ""} ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-medium ${styles.title}`}>
          {title}
        </p>
        {icon && (
          <div className={styles.icon}>
            {icon}
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold ${styles.value}`}>
        {value}
      </p>
      {description && (
        <p className={`text-xs ${isGradient ? "text-white/80" : "text-gray-500 dark:text-gray-500"}`}>
          {description}
        </p>
      )}
    </div>
  );
}

"use client";

interface ProfileInfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  onChangeClick?: () => void;
  changeLabel?: string;
}

export default function ProfileInfoItem({
  icon: Icon,
  iconBgColor,
  iconColor,
  label,
  value,
  onChangeClick,
  changeLabel,
}: ProfileInfoItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
        </div>
      </div>
      {onChangeClick && changeLabel && (
        <button
          onClick={onChangeClick}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {changeLabel}
        </button>
      )}
    </div>
  );
}

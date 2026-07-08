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
    <div className="flex items-start justify-between gap-3 min-w-0">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <div className="font-medium text-gray-900 dark:text-white break-words">{value}</div>
        </div>
      </div>
      {onChangeClick && changeLabel && (
        <button
          onClick={onChangeClick}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
        >
          {changeLabel}
        </button>
      )}
    </div>
  );
}

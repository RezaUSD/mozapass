import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'coral'
  | 'lime'
  | 'dark'
  | 'outline'
  | 'danger'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Sesuai referensi Learnify: tombol CTA utama berwarna Coral (#F05A36) berteks putih
  primary:
    'bg-[#F05A36] text-white hover:bg-[#D94B29] active:bg-[#C43E1D] font-bold shadow-sm',
  coral:
    'bg-[#F05A36] text-white hover:bg-[#D94B29] active:bg-[#C43E1D] font-bold shadow-sm',
  // Aturan Kontras Wajib: #D2F865 / #FFE37E selalu berteks gelap #181824
  lime:
    'bg-[#D2F865] text-[#181824] border-[1.5px] border-[#181824] hover:bg-[#C4EE50] font-bold shadow-sm',
  dark:
    'bg-[#181824] text-white hover:bg-[#2C2C36] font-bold shadow-sm',
  outline:
    'bg-white text-[#181824] border-[1.5px] border-[#181824] hover:bg-[#F7F7FA] font-bold',
  danger:
    'bg-[#FDE2E4] text-[#8A1C24] border-[1.5px] border-[#8A1C24]/30 hover:bg-[#fbd0d3] font-bold',
  ghost:
    'bg-transparent text-[#6E6E82] hover:text-[#181824] hover:bg-[#ECECF2]/60 font-semibold',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-sm sm:text-base rounded-2xl',
  icon: 'h-9 w-9 p-0 flex items-center justify-center rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#181824]/25 disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

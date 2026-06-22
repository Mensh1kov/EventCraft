import { useRef, useState } from "react";
import { useOutsideClickDetector } from "@plane/hooks";
import { IconButton } from "@plane/propel/icon-button";
import { CloseIcon, SearchIcon } from "@plane/propel/icons";
import { cn } from "@plane/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const TemplateSearch = ({ value, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useOutsideClickDetector(containerRef, () => {
    if (isOpen && value.trim() === "") setIsOpen(false);
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (value.trim() !== "") onChange("");
      else setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="flex items-center">
      {!isOpen && (
        <IconButton
          variant="ghost"
          size="lg"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          icon={SearchIcon}
        />
      )}
      <div
        className={cn(
          "ml-auto flex w-0 items-center justify-start gap-1 overflow-hidden rounded-md border border-transparent bg-surface-1 text-placeholder opacity-0 transition-[width] ease-linear",
          {
            "w-64 border-subtle px-2.5 py-1.5 opacity-100": isOpen,
          }
        )}
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <input
          ref={inputRef}
          className="w-full border-none bg-transparent text-13 text-primary placeholder:text-placeholder focus:outline-none"
          placeholder="Поиск по названию..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isOpen && (
          <button
            type="button"
            className="grid place-items-center"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            aria-label="Очистить"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};

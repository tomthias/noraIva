import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxProps {
    items: string[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    emptyText?: string
    className?: string
    modal?: boolean
    allowCustom?: boolean
}

export function Combobox({
    items,
    value = "",
    onChange,
    placeholder = "Seleziona...",
    emptyText = "Nessun risultato.",
    className,
    modal = false,
    allowCustom = true,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    // Filtriamo gli items unici e ordinati
    const uniqueItems = React.useMemo(() => {
        return Array.from(new Set(items)).sort()
    }, [items])

    const handleSelect = (currentValue: string) => {
        onChange(currentValue)
        setOpen(false)
        setInputValue("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={modal}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
                >
                    {value || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder={placeholder}
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {allowCustom && inputValue.trim().length > 0 ? (
                                <div
                                    className="py-2 px-4 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                                    onClick={() => handleSelect(inputValue)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Crea "{inputValue}"
                                </div>
                            ) : (
                                emptyText
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {uniqueItems.map((item) => (
                                <CommandItem
                                    key={item}
                                    value={item}
                                    onSelect={() => {
                                        // cmdk returns lowercased value usually, so we use the real item text
                                        handleSelect(item)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item}
                                </CommandItem>
                            ))}
                        </CommandGroup>

                        {allowCustom && inputValue.trim().length > 0 && !uniqueItems.map(i => i.toLowerCase()).includes(inputValue.toLowerCase()) && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        value={inputValue}
                                        onSelect={() => handleSelect(inputValue)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Crea "{inputValue}"
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}

                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

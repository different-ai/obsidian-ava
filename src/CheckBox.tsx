import React from "react";
interface CheckBoxProps {
    label: string;
    subText: string;
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export const CheckBox = ({ label, subText, checked, onChange }: CheckBoxProps) => {
    return (
        <div className="flex  items-center">
            <input
                aria-describedby="comments-description"
                name="comments"
                id="comments"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                onChange={onChange}
                checked={checked}
            />
            <div className="ml-3 text-sm">
                <label htmlFor="comments" className="font-medium cursor-pointer">
                    {label}
                    <div id="comments-description" className="text-gray-500">
                        {subText}
                    </div>
                </label>
            </div>
        </div>
    );
}


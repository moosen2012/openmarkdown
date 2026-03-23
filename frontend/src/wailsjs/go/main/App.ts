// @ts-ignore
import {Call as $Call, Register as $Register} from "@wailsio/runtime";

// @ts-ignore
import * as Application from "../application.js";

// @ts-ignore
import * as Go from "../../go.js";

export function ListFolderFiles(arg1: string): Promise<Array<FileInfo>> {
    return $Call.ByID(1400147347, arg1);
}

export function ListMarkdownFiles(arg1: string): Promise<Array<FileInfo>> {
    return $Call.ByID(2628132885, arg1);
}

export function ParseMarkdown(arg1: string): Promise<string> {
    return $Call.ByID(3478512130, arg1);
}

export function ParseOutline(arg1: string): Promise<Array<OutlineItem>> {
    return $Call.ByID(3763394749, arg1);
}

export function ReadFile(arg1: string): Promise<string> {
    return $Call.ByID(234044479, arg1);
}

export function SaveFile(arg1: string, arg2: string): Promise<void> {
    return $Call.ByID(2426500854, arg1, arg2);
}

export function SaveFileDialog(arg1: string): Promise<string> {
    return $Call.ByID(3896042426, arg1);
}

export function SelectFile(): Promise<string> {
    return $Call.ByID(3731364846);
}

export function SelectFolder(): Promise<string> {
    return $Call.ByID(1234567890);
}

export interface FileInfo {
    IsDir: boolean;
    Name: string;
    Path: string;
}

export interface OutlineItem {
    ID: string;
    Level: number;
    Title: string;
}

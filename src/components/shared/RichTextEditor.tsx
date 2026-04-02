import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Indent,
  IndentBlock,
  BlockQuote,
  Heading,
  FontSize,
  FontFamily,
  FontColor,
  FontBackgroundColor,
  Highlight,
  SpecialCharacters,
  SpecialCharactersEssentials,
  Alignment,
  List,
  Link,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  Base64UploadAdapter,
  Table,
  TableToolbar,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

interface RichTextEditorProps {
  initialData?: string;
  onChange?: (data: string) => void;
  isReadOnly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialData = '',
  onChange,
  isReadOnly = false,
}) => {
  return (
    <CKEditor
      editor={ClassicEditor}
      config={{
        licenseKey: 'GPL',
        plugins: [
          Essentials, Paragraph,
          Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
          Indent, IndentBlock, BlockQuote,
          Heading, FontSize, FontFamily, FontColor, FontBackgroundColor,
          Highlight, SpecialCharacters, SpecialCharactersEssentials,
          Alignment, List, Link,
          Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageUpload, Base64UploadAdapter,
          Table, TableToolbar,
        ],
        toolbar: {
          items: [
            'heading', '|',
            'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
            'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'highlight', '|',
            'specialCharacters', '|',
            'alignment', '|',
            'numberedList', 'bulletedList', '|',
            'link', 'blockQuote', 'insertImage', 'insertTable', '|',
            'undo', 'redo',
          ],
          shouldNotGroupWhenFull: false,
        },
        initialData,
      }}
      disabled={isReadOnly}
      onChange={(_event, editor) => {
        onChange?.(editor.getData());
      }}
    />
  );
};

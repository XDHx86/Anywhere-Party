/**
 * Material Design 3 File Input Component
 * Implements Material Design 3 file input with drag and drop support
 */

import React, { forwardRef, useRef, useState, useCallback } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialButton } from './MaterialButton';
import { MaterialIcon } from './MaterialIcon';
import { useMaterialTheme } from '../../theme';
import { createTransition } from '../../animations/material-animations';

export interface MaterialFileInputProps {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  onFileSelect?: (files: FileList | null) => void;
  onFileContent?: (content: string, file: File) => void;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

// Styled components
const FileInputContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const FileInputLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
}));

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragOver' && prop !== 'error' && prop !== 'disabled',
})<{ isDragOver: boolean; error: boolean; disabled: boolean }>(
  ({ theme, isDragOver, error, disabled }) => ({
    border: `2px dashed ${
      error ? theme.palette.error.main : isDragOver ? theme.palette.primary.main : '#79747e' // Material outline color
    }`,
    borderRadius: '12px',
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: isDragOver
      ? theme.palette.primary.main + '08' // 8% opacity
      : theme.palette.background.paper,
    transition: createTransition(['border-color', 'background-color'], 'short4', 'standard'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,

    '&:hover': !disabled && {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.primary.main + '04', // 4% opacity
    },
  })
);

const DropZoneContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const FileIcon = styled(Box)(({ theme }) => ({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main + '12', // 12% opacity
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.primary.main,
}));

const SelectedFilesList = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const FileItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5),
  backgroundColor: '#e7e0ec', // Material surfaceVariant color
  borderRadius: '8px',
  marginBottom: theme.spacing(1),
}));

const FileInfo = styled(Box)({
  flex: 1,
});

const FileName = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

const FileSize = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const HelperText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'error',
})<{ error?: boolean }>(({ theme, error }) => ({
  fontSize: '0.75rem',
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  lineHeight: 1.4,
}));

const HiddenInput = styled('input')({
  display: 'none',
});

export const MaterialFileInput = forwardRef<HTMLInputElement, MaterialFileInputProps>(
  (
    {
      label,
      helperText,
      error = false,
      errorText,
      accept,
      multiple = false,
      maxSize,
      onFileSelect,
      onFileContent,
      disabled = false,
      className,
      'data-testid': testId,
    },
    ref
  ) => {
    useMaterialTheme();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const validateFile = (file: File): boolean => {
      if (maxSize && file.size > maxSize) {
        return false;
      }
      return true;
    };

    const handleFiles = useCallback(
      (files: FileList | null) => {
        if (!files || disabled) return;

        const validFiles = Array.from(files).filter(validateFile);
        setSelectedFiles(validFiles);
        onFileSelect?.(files);

        // Read file content if callback provided
        if (onFileContent && validFiles.length > 0) {
          const file = validFiles[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            onFileContent(content, file);
          };
          reader.readAsText(file);
        }
      },
      [disabled, maxSize, onFileSelect, onFileContent]
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
    };

    const handleDragOver = (event: React.DragEvent) => {
      event.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
    };

    const handleDrop = (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
      if (!disabled) {
        handleFiles(event.dataTransfer.files);
      }
    };

    const handleClick = () => {
      if (!disabled) {
        inputRef.current?.click();
      }
    };

    const removeFile = (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
    };

    const displayHelperText = error && errorText ? errorText : helperText;

    return (
      <FileInputContainer className={className}>
        {label && <FileInputLabel>{label}</FileInputLabel>}

        <DropZone
          isDragOver={isDragOver}
          error={error}
          disabled={disabled}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <DropZoneContent>
            <FileIcon>
              <MaterialIcon name="upload_file" size="large" />
            </FileIcon>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                {isDragOver ? 'Drop files here' : 'Choose files or drag and drop'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {accept ? `Accepted formats: ${accept}` : 'All file types accepted'}
                {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
              </Typography>
            </Box>

            <MaterialButton
              variant="outlined"
              size="small"
              disabled={disabled}
              startIcon={<MaterialIcon name="folder_open" size="small" />}
            >
              Browse Files
            </MaterialButton>
          </DropZoneContent>
        </DropZone>

        {selectedFiles.length > 0 && (
          <SelectedFilesList>
            {selectedFiles.map((file, index) => (
              <FileItem key={`${file.name}-${index}`}>
                <MaterialIcon name="description" size="medium" color="primary" />
                <FileInfo>
                  <FileName>{file.name}</FileName>
                  <FileSize>{formatFileSize(file.size)}</FileSize>
                </FileInfo>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                >
                  <MaterialIcon name="close" size="small" />
                </IconButton>
              </FileItem>
            ))}
          </SelectedFilesList>
        )}

        {displayHelperText && <HelperText error={error}>{displayHelperText}</HelperText>}

        <HiddenInput
          ref={ref || inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          data-testid={testId}
        />
      </FileInputContainer>
    );
  }
);

MaterialFileInput.displayName = 'MaterialFileInput';

export default MaterialFileInput;

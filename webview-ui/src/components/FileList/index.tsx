import styles from "./FileList.module.css";

interface FileListProps {
  files: string[];
  nameMap: Record<string, string>;
  activeFile: string | null;
  onSelect: (fileName: string) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  nameMap,
  activeFile,
  onSelect,
}) => {
  return (
    <ul className={styles.list}>
      {files.map((file) => (
        <li
          key={file}
          className={`${styles.item} ${activeFile === file ? styles.active : ""}`}
          onClick={() => onSelect(file)}
        >
          <div className={styles.fileItem}>
            <div className={styles.fileName}>{file}</div>
            {nameMap[file] && (
              <div className={styles.fileSubtitle}>{nameMap[file]}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

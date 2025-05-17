use std::fmt;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::Path;
use std::process::Command;
use zip::read::ZipArchive;
use sevenz_rust::decompress_file;

#[derive(Debug)]
pub enum ArchiveError {
    Io(String),
    UnsupportedFormat(String),
    InvalidArchive(String),
}

impl fmt::Display for ArchiveError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ArchiveError::Io(err) => write!(f, "IO error: {}", err),
            ArchiveError::UnsupportedFormat(err) => write!(f, "Unsupported format: {}", err),
            ArchiveError::InvalidArchive(err) => write!(f, "Invalid archive: {}", err),
        }
    }
}

impl std::error::Error for ArchiveError {}

impl From<std::io::Error> for ArchiveError {
    fn from(err: std::io::Error) -> Self {
        ArchiveError::Io(err.to_string())
    }
}

impl From<zip::result::ZipError> for ArchiveError {
    fn from(err: zip::result::ZipError) -> Self {
        ArchiveError::InvalidArchive(err.to_string())
    }
}

pub fn unarchive_file_with_progress<F>(
    file_path: &str,
    output_dir: &str,
    progress_callback: F,
) -> Result<(), ArchiveError>
where
    F: Fn(f32),
{
    let path = Path::new(file_path);
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .ok_or_else(|| ArchiveError::UnsupportedFormat("No file extension".to_string()))?;

    fs::create_dir_all(output_dir)?;

    match extension.as_str() {
        "zip" => extract_zip(file_path, output_dir, progress_callback),
        "7z" => extract_7z(file_path, output_dir, progress_callback),
        "rar" => extract_rar(file_path, output_dir, progress_callback),
        _ => Err(ArchiveError::UnsupportedFormat(format!(
            "Unsupported file format: {}",
            extension
        ))),
    }
}

fn extract_zip<F>(file_path: &str, output_dir: &str, progress_callback: F) -> Result<(), ArchiveError>
where
    F: Fn(f32),
{
    let file = File::open(file_path)?;
    let mut archive = ZipArchive::new(file)?;
    let total_files = archive.len() as f32;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let file_path = file
            .enclosed_name()
            .ok_or_else(|| ArchiveError::InvalidArchive("Invalid file path in archive".to_string()))?;
        let output_path = Path::new(output_dir).join(file_path);

        if file.name().ends_with('/') {
            fs::create_dir_all(&output_path)?;
        } else {
            if let Some(parent) = output_path.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut outfile = File::create(&output_path)?;
            io::copy(&mut file, &mut outfile)?;
        }

        // Report progress
        let progress = ((i + 1) as f32 / total_files) * 100.0;
        progress_callback(progress);
    }
    Ok(())
}

fn extract_7z<F>(file_path: &str, output_dir: &str, progress_callback: F) -> Result<(), ArchiveError>
where
    F: Fn(f32),
{
    // sevenz_rust does not support progress callbacks directly
    progress_callback(0.0);
    decompress_file(file_path, output_dir)
        .map_err(|e| ArchiveError::InvalidArchive(e.to_string()))?;
    progress_callback(100.0);
    Ok(())
}

fn extract_rar<F>(file_path: &str, output_dir: &str, progress_callback: F) -> Result<(), ArchiveError>
where
    F: Fn(f32),
{
    fs::create_dir_all(output_dir)?;
    progress_callback(0.0);
    let status = Command::new("unrar")
        .args(&["x", file_path, output_dir])
        .status()?;
    if status.success() {
        progress_callback(100.0);
        Ok(())
    } else {
        Err(ArchiveError::InvalidArchive("RAR extraction failed".to_string()))
    }
}
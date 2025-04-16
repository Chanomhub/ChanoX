// src/archiver.rs
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

/// Unarchives the file located at `file_path` into the directory `output_dir`.
pub fn unarchive_file(file_path: &str, output_dir: &str) -> Result<(), ArchiveError> {
    let path = Path::new(file_path);
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .ok_or_else(|| ArchiveError::UnsupportedFormat("No file extension".to_string()))?;

    // Create output directory if it doesn't exist.
    fs::create_dir_all(output_dir)?;

    match extension.as_str() {
        "zip" => extract_zip(file_path, output_dir),
        "7z" => extract_7z(file_path, output_dir),
        "rar" => extract_rar(file_path, output_dir),
        _ => Err(ArchiveError::UnsupportedFormat(format!(
            "Unsupported file format: {}",
            extension
        ))),
    }
}

/// Extract ZIP archives using the `zip` crate.
fn extract_zip(file_path: &str, output_dir: &str) -> Result<(), ArchiveError> {
    let file = File::open(file_path)?;
    let mut archive = ZipArchive::new(file)?;

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
    }
    Ok(())
}

/// Extract 7z archives using the `sevenz_rust` crate.
fn extract_7z(file_path: &str, output_dir: &str) -> Result<(), ArchiveError> {
    decompress_file(file_path, output_dir)
        .map_err(|e| ArchiveError::InvalidArchive(e.to_string()))?;
    Ok(())
}

/// Extract RAR archives by calling the system’s unrar executable.
/// Note: Make sure that the `unrar` command is installed on your system.
fn extract_rar(file_path: &str, output_dir: &str) -> Result<(), ArchiveError> {
    // Create the output directory (if necessary) for extraction.
    fs::create_dir_all(output_dir)?;
    // Run the unrar command with 'x' (extract with full paths)
    let status = Command::new("unrar")
        .args(&["x", file_path, output_dir])
        .status()?;
    if status.success() {
        Ok(())
    } else {
        Err(ArchiveError::InvalidArchive("RAR extraction failed".to_string()))
    }
}

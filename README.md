# Image Converter

This project is a simple Node.js script that converts images from an input directory to WebP and AVIF formats in an output directory. It uses the `sharp` library for high-performance image processing.

## Features

*   Converts images to WebP and AVIF formats.
*   Allows specifying output quality for converted images.
*   Automatically creates the output directory if it doesn't exist.

## Prerequisites

Before you begin, ensure you have Node.js installed on your system.

## Installation

1.  Clone this repository or download the project files.
2.  Navigate to the project directory in your terminal:
    ```bash
    cd image-converter
    ```
3.  Install the necessary dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Place your input images in the `input/` directory. (Note: The `inputDir` and `outputDir` variables in `index.js` currently use placeholder paths. You will need to update these variables in `index.js` to point to your actual input and output directories.)
2.  Run the conversion script. You can optionally specify a quality parameter (0-100). If not specified, it defaults to 80.

    ```bash
    node index.js [quality]
    ```

    **Examples:**

    *   Convert with default quality (80):
        ```bash
        node index.js
        ```
    *   Convert with 90% quality:
        ```bash
        node index.js 90
        ```

3.  The converted images will be saved in the `output/` directory.

## Project Structure

*   `index.js`: The main script for image conversion.
*   `input/`: Directory to place your original images for conversion.
*   `output/`: Directory where the converted WebP and AVIF images will be saved.
*   `package.json`: Defines project metadata and dependencies.

## Dependencies

*   `sharp`: High-performance Node.js image processing, the fastest way to resize JPEG, PNG, WebP, AVIF and TIFF images.

## License

This project is licensed under the ISC License.

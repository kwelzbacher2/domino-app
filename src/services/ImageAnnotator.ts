/**
 * ImageAnnotator - Annotates images with detection results
 * Overlays bounding boxes and pip counts on detected domino tiles
 * 
 * Requirements: 4.1, 4.2
 * - Display original image with detected tiles highlighted
 * - Overlay pip count for each tile
 */

import type { DetectedTile, ImageData } from '../models/types';

/**
 * Annotation styling configuration
 */
const ANNOTATION_STYLE = {
  // Bounding box
  boxColor: '#00FF00', // Green for detected tiles
  boxWidth: 3,
  boxOpacity: 0.8,
  
  // Label background
  labelBackgroundColor: '#00FF00',
  labelBackgroundOpacity: 0.9,
  labelPadding: 8,
  labelMargin: 5,
  
  // Text
  textColor: '#000000',
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
};

/**
 * ImageAnnotator service for annotating detection results
 */
export class ImageAnnotator {
  /**
   * Load image from data URL and create an HTMLImageElement
   */
  private async loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }

  /**
   * Draw a bounding box on the canvas
   */
  private drawBoundingBox(
    ctx: CanvasRenderingContext2D,
    tile: DetectedTile
  ): void {
    const { x, y, width, height } = tile.boundingBox;

    // Set box style
    ctx.strokeStyle = ANNOTATION_STYLE.boxColor;
    ctx.lineWidth = ANNOTATION_STYLE.boxWidth;
    ctx.globalAlpha = ANNOTATION_STYLE.boxOpacity;

    // Draw rectangle
    ctx.strokeRect(x, y, width, height);

    // Reset alpha
    ctx.globalAlpha = 1.0;
  }

  /**
   * Draw pip count label on the canvas
   */
  private drawPipCountLabel(
    ctx: CanvasRenderingContext2D,
    tile: DetectedTile
  ): void {
    const { x, y, width } = tile.boundingBox;
    const { leftPips, rightPips, totalPips } = tile;

    // Format label text - show just the number if it's a single half (rightPips === 0)
    const labelText = rightPips === 0 
      ? `${leftPips}` 
      : `${leftPips}|${rightPips} (${totalPips})`;

    // Set font for measuring
    ctx.font = `${ANNOTATION_STYLE.fontWeight} ${ANNOTATION_STYLE.fontSize}px ${ANNOTATION_STYLE.fontFamily}`;
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const textHeight = ANNOTATION_STYLE.fontSize;

    // Calculate label position (centered above the bounding box)
    const labelX = x + (width - textWidth) / 2 - ANNOTATION_STYLE.labelPadding;
    const labelY = y - textHeight - ANNOTATION_STYLE.labelMargin - ANNOTATION_STYLE.labelPadding;
    const labelWidth = textWidth + ANNOTATION_STYLE.labelPadding * 2;
    const labelHeight = textHeight + ANNOTATION_STYLE.labelPadding * 2;

    // Draw label background
    ctx.fillStyle = ANNOTATION_STYLE.labelBackgroundColor;
    ctx.globalAlpha = ANNOTATION_STYLE.labelBackgroundOpacity;
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

    // Draw label text
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = ANNOTATION_STYLE.textColor;
    ctx.fillText(
      labelText,
      labelX + ANNOTATION_STYLE.labelPadding,
      labelY + ANNOTATION_STYLE.labelPadding + textHeight * 0.8
    );
  }

  /**
   * Annotate an image with detection results
   * Returns a new data URL with bounding boxes and pip counts overlaid
   */
  async annotateImage(
    imageData: ImageData,
    tiles: DetectedTile[]
  ): Promise<string> {
    try {
      // Load the original image
      const img = await this.loadImageElement(imageData.dataUrl);

      // Create canvas with same dimensions as image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw annotations for each tile
      for (const tile of tiles) {
        this.drawBoundingBox(ctx, tile);
        this.drawPipCountLabel(ctx, tile);
      }

      // Convert canvas to data URL
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      throw new Error(
        `Image annotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a summary annotation with total score
   * Adds a header with total score and tile count
   */
  async annotateImageWithSummary(
    imageData: ImageData,
    tiles: DetectedTile[],
    totalScore: number
  ): Promise<string> {
    try {
      // First annotate with individual tiles
      const annotatedDataUrl = await this.annotateImage(imageData, tiles);

      // Load the annotated image
      const img = await this.loadImageElement(annotatedDataUrl);

      // Create canvas with extra space at top for summary
      const summaryHeight = 60;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height + summaryHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Draw summary background
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, canvas.width, summaryHeight);

      // Draw summary text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial, sans-serif';
      const summaryText = `Total Score: ${totalScore} (${tiles.length} tiles)`;
      const textMetrics = ctx.measureText(summaryText);
      const textX = (canvas.width - textMetrics.width) / 2;
      const textY = summaryHeight / 2 + 8;
      ctx.fillText(summaryText, textX, textY);

      // Draw annotated image below summary
      ctx.drawImage(img, 0, summaryHeight);

      // Convert canvas to data URL
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      throw new Error(
        `Image annotation with summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const imageAnnotator = new ImageAnnotator();

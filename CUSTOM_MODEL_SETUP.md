# Custom Model Setup Guide

Your app is now ready to use a custom-trained domino detection model! Here's how to set it up.

## Current Status

✅ Code is ready to load custom models
✅ Folder structure created (`public/models/custom-domino/`)
✅ Configuration system in place
⏳ Waiting for your trained model files

## Quick Start: Train on Roboflow

### Step 1: Create Project
1. Go to https://app.roboflow.com/
2. Sign up (free)
3. Click "Create New Project"
4. Name: "Domino Detector"
5. Type: "Object Detection"

### Step 2: Get Training Data

**IMPORTANT**: Your app uses double-12 dominoes (pip values 0-12), but most existing datasets only cover 0-9.

**Recommended Approach (Hybrid)**:
1. Download existing 0-9 datasets from Roboflow Universe:
   - https://universe.roboflow.com/ali-amr-656xv/domino-point-counter-ubn6u (2800 images, 0-9)
   - https://universe.roboflow.com/fayez/domino-count (0-9)
2. Take 50-100 photos of YOUR double-12 dominoes
3. Focus on dominoes with 10, 11, and 12 pips
4. Also include some 0-9 examples in your style
5. Upload all to your Roboflow project

**Why this works**:
- ✅ Existing datasets provide lots of 0-9 training data
- ✅ Your photos add 10-12 coverage
- ✅ Your photos ensure model works with your specific domino style
- ✅ Less annotation work (existing data is already labeled)

**Alternative (From Scratch)**:
- Take 200+ photos of only your dominoes
- Annotate all of them (0-12)
- More work, but perfectly tailored to your dominoes

### Step 3: Annotate Your Photos

**For double-12 dominoes, annotate each HALF separately**:

1. Click on an image
2. Draw a box around the LEFT half of a domino
3. Label it with the pip count: "0", "1", "2", ... "12"
4. Draw a box around the RIGHT half
5. Label it with its pip count
6. Repeat for all dominoes in the image
7. Repeat for all your photos

**Example**: A domino showing 10|12 gets TWO boxes:
- Box 1: Around left half, labeled "10"
- Box 2: Around right half, labeled "12"

**Classes you need**: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 (13 total)

**Tip**: The existing 0-9 datasets are already annotated this way, so you only need to annotate your own photos!

### Step 4: Generate Dataset
1. Click "Generate"
2. Choose split: 70% train, 20% valid, 10% test
3. Add augmentations:
   - ✅ Rotation: ±15°
   - ✅ Brightness: ±25%
   - ✅ Blur: Up to 1px
   - ✅ Noise: Up to 2%
4. Click "Generate"

### Step 5: Train Model
1. Click "Train"
2. Choose training method:
   - **Traditional (YOLOv8)** - For Maximum Accuracy
     - Choose YOLOv8 Medium or Large
     - Longer training (30-60 minutes)
     - Best with 1000+ images (you'll have 3000+)
     - State-of-the-art accuracy
     - **Recommended for production use**
   - **Roboflow Rapid** - For Quick Testing
     - Faster training (5-10 minutes)
     - Good for prototyping
     - Uses foundation models
3. Click "Start Training"
4. Wait for training to complete ☕

**For maximum accuracy with double-12 dominoes**: 
- Use **Traditional YOLOv8 Medium or Large**
- Combine all available 0-9 datasets (3000+ images)
- Add 100-200 of your own double-12 photos
- Enable all augmentations
- This will give you 95%+ accuracy

### Step 6: Download Model
1. After training, go to "Deploy"
2. Look for "TensorFlow.js" tab
3. Click "Download Model"
4. Extract the ZIP file
5. You'll get:
   - `model.json`
   - `group1-shard1of1.bin` (or similar)

### Step 7: Install in App
1. Copy model files to: `public/models/custom-domino/`
2. Open `.env` file
3. Change: `VITE_USE_CUSTOM_MODEL=false` → `VITE_USE_CUSTOM_MODEL=true`
4. Restart dev server: Stop and run `npm run dev` again
5. Test with your domino images!

## Alternative: Local Training (Advanced)

If you want to train locally with Python:

### Requirements
- Python 3.8+
- GPU recommended (but not required)
- 4GB+ RAM

### Steps
```bash
# Install YOLOv8
pip install ultralytics tensorflowjs

# Train model
yolo detect train data=domino.yaml model=yolov8n.pt epochs=100

# Convert to TensorFlow.js
# (This requires additional steps - see YOLOv8 docs)
```

## Switching Between Models

You can easily switch detection methods by editing `.env`:

```bash
# Use COCO-SSD (current - not great for dominoes)
VITE_USE_CUSTOM_MODEL=false
VITE_USE_ROBOFLOW_API=false

# Use your custom local model (best - offline, accurate)
VITE_USE_CUSTOM_MODEL=true
VITE_USE_ROBOFLOW_API=false

# Use Roboflow hosted API (requires internet)
VITE_USE_CUSTOM_MODEL=false
VITE_USE_ROBOFLOW_API=true
```

## Expected Results

With a well-trained custom model:
- ✅ **Accuracy**: 90-95%+ detection rate
- ✅ **Speed**: 1-3 seconds per image
- ✅ **Offline**: Works without internet
- ✅ **Consistent**: Works with your specific dominoes

## Troubleshooting

### Model won't load
- Check browser console for errors
- Verify files are in `public/models/custom-domino/`
- Make sure `VITE_USE_CUSTOM_MODEL=true` in `.env`
- Restart dev server after changes

### Model detects nothing
- Check model output format in console
- May need to adjust `parseModelOutput()` in `CustomModelDetector.ts`
- Try with different test images

### Low accuracy
- Train with more images (500+ recommended)
- Add more augmentations
- Include photos of YOUR specific dominoes
- Train for more epochs

## Need Help?

1. Check the browser console for error messages
2. Look at `src/services/CustomModelDetector.ts` for detection logic
3. The `parseModelOutput()` function may need adjustment for your model's format

## What's Next?

Once your model is working:
1. Test with various domino images
2. Fine-tune if needed (retrain with problem images)
3. Deploy your app!
4. Consider training a pip-counting model for even better accuracy

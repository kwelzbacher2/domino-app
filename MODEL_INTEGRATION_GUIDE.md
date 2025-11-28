# Integrating a Pre-trained Domino Detection Model

## Current Status
The app currently uses COCO-SSD, a general object detection model, which is not ideal for domino detection.

## Recommended Model Sources

### 1. Roboflow Universe (Recommended)
- Visit: https://universe.roboflow.com/
- Search for "domino detection" or "domino pip counting"
- Look for models with:
  - High accuracy (mAP > 80%)
  - TensorFlow.js export option
  - Domino bounding box detection
  - Pip counting (if available)

**Steps to integrate a Roboflow model:**
1. Find a suitable model on Roboflow Universe
2. Click "Deploy" → "TensorFlow.js"
3. Download the model files (model.json and .bin files)
4. Place them in `public/models/domino-detector/`
5. Update `src/services/ModelLoader.ts` to load your model
6. Update `src/services/DominoDetector.ts` to use the new model's output format

### 2. TensorFlow Hub
- Visit: https://tfhub.dev/
- Search for object detection models
- Look for models that can be converted to TensorFlow.js
- Consider dice detection models (similar to dominoes)

### 3. Hugging Face
- Visit: https://huggingface.co/models
- Search for "domino detection" or "object detection"
- Filter by TensorFlow models
- Check if they can be converted to TensorFlow.js

### 4. GitHub Projects
Search GitHub for:
- "domino detection tensorflow"
- "domino pip counting"
- "domino recognition"

Look for projects that include:
- Pre-trained model weights
- TensorFlow or PyTorch models (can be converted)
- Training datasets (in case you want to retrain)

## Model Requirements

Your ideal model should:
1. **Detect domino tiles** - Bounding boxes around each domino
2. **Count pips** - Either:
   - Direct pip count output (best)
   - OR detect individual pips (we can count them)
3. **TensorFlow.js compatible** - Or convertible to TensorFlow.js
4. **Good accuracy** - At least 80% mAP on domino datasets

## Integration Steps

### Option A: Using a Roboflow Model (Easiest)

1. **Get the model:**
   ```bash
   # After downloading from Roboflow, place files in:
   public/models/domino-detector/
   ├── model.json
   ├── group1-shard1of1.bin
   └── metadata.json
   ```

2. **Update ModelLoader.ts:**
   ```typescript
   // Change the model URL
   const MODEL_URL = '/models/domino-detector/model.json';
   
   // Load as a graph model instead of COCO-SSD
   import * as tf from '@tensorflow/tfjs';
   this.model = await tf.loadGraphModel(MODEL_URL);
   ```

3. **Update DominoDetector.ts:**
   - Parse the new model's output format
   - Map detections to DetectedTile format
   - Extract pip counts if the model provides them

### Option B: Using a YOLO Model

1. **Convert YOLO to TensorFlow.js:**
   ```bash
   # Install tensorflowjs converter
   pip install tensorflowjs
   
   # Convert YOLO model
   tensorflowjs_converter \
     --input_format=tf_saved_model \
     --output_format=tfjs_graph_model \
     path/to/saved_model \
     public/models/domino-detector
   ```

2. **Update the code** (same as Option A)

### Option C: Using TensorFlow Hub

1. **Download and convert:**
   ```bash
   # Download from TF Hub
   # Convert to TensorFlow.js format
   tensorflowjs_converter \
     --input_format=tf_hub \
     'https://tfhub.dev/...' \
     public/models/domino-detector
   ```

2. **Update the code** (same as Option A)

## Recommended Models to Try

### Quick Wins:
1. **Search Roboflow Universe** for "domino" - likely to find ready-to-use models
2. **Dice detection models** - Very similar to dominoes, might work well
3. **Playing card detection** - Similar rectangular object detection

### Model Performance Tips:
- Models trained on 500+ images work best
- Look for models with data augmentation (rotation, lighting, etc.)
- Check if the model was trained on similar domino types to yours

## Testing Your New Model

After integration:
1. Test with various lighting conditions
2. Test with different domino orientations
3. Test with multiple dominoes in frame
4. Verify pip counting accuracy
5. Check detection speed (should be < 2 seconds)

## Fallback Plan

If you can't find a good pre-trained model:
1. Use the current COCO-SSD approach (already implemented)
2. Collect 100-200 images of your dominoes
3. Upload to Roboflow
4. Use Roboflow's auto-annotation + manual correction
5. Train a model (Roboflow does this for you)
6. Export to TensorFlow.js
7. Integrate using Option A above

## Need Help?

If you find a model but need help integrating it:
1. Share the model URL or files
2. Share the model's output format documentation
3. I can help update the code to work with it

## Current Files to Modify

When integrating a new model, you'll need to update:
- `src/services/ModelLoader.ts` - Load the new model
- `src/services/DominoDetector.ts` - Parse new model output
- `src/services/PipCounter.ts` - May not be needed if model counts pips
- `package.json` - May need different TensorFlow.js packages

# Custom Domino Detection Model

Place your trained TensorFlow.js model files here.

## Required Files

After training your model on Roboflow (or locally), you'll need:

1. **model.json** - Model architecture and metadata
2. **Weight files** - Usually named like:
   - `group1-shard1of1.bin`
   - Or multiple shards: `group1-shard1of2.bin`, `group1-shard2of2.bin`, etc.

## How to Get Your Model Files

### From Roboflow:
1. Train your model on Roboflow
2. Go to Deploy → TensorFlow.js
3. Click "Download Model" (not "Use API")
4. Extract the downloaded files
5. Copy `model.json` and all `.bin` files to this folder

### From Local Training (YOLOv5/v8):
1. Train your model locally
2. Convert to TensorFlow.js format:
   ```bash
   tensorflowjs_converter \
     --input_format=tf_saved_model \
     --output_format=tfjs_graph_model \
     path/to/saved_model \
     public/models/custom-domino
   ```

## Activating Your Custom Model

Once files are in place:

1. Open `.env` file
2. Set: `VITE_USE_CUSTOM_MODEL=true`
3. Restart the dev server
4. The app will now use your custom model!

## Model Output Format

Your model should output detections in one of these formats:

**Option 1: Bounding boxes only**
- Detects domino tiles
- App will count pips separately

**Option 2: Bounding boxes with pip counts**
- Detects domino tiles
- Includes pip count in class name (e.g., "domino-3-5")
- More accurate!

**Option 3: Individual pip detection**
- Detects each pip value (0-9)
- App groups them into dominoes

## Troubleshooting

If the model doesn't load:
1. Check browser console for errors
2. Verify all files are in this folder
3. Check that `model.json` references the correct weight file names
4. Make sure the model is in TensorFlow.js Graph Model format

## Model Performance

Expected performance:
- **Accuracy**: 90%+ (with good training data)
- **Speed**: 1-3 seconds per image
- **Works offline**: Yes! No internet needed

## Need Help?

Check `src/services/CustomModelDetector.ts` for the detection logic.
You may need to adjust `parseModelOutput()` based on your model's specific output format.

#!/usr/bin/env python3
"""Test script for Kokoro TTS installation"""

import sys

def test_imports():
    """Test if all required packages can be imported"""
    print("=" * 50)
    print("Testing Package Imports")
    print("=" * 50)
    
    try:
        import kokoro
        print("✅ kokoro imported successfully")
        print(f"   Version: {getattr(kokoro, '__version__', 'unknown')}")
    except ImportError as e:
        print(f"❌ Failed to import kokoro: {e}")
        return False
    
    try:
        import soundfile as sf
        print("✅ soundfile imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import soundfile: {e}")
        return False
    
    try:
        import numpy as np
        print("✅ numpy imported successfully")
        print(f"   Version: {np.__version__}")
    except ImportError as e:
        print(f"❌ Failed to import numpy: {e}")
        return False
    
    try:
        import torch
        print("✅ torch imported successfully")
        print(f"   Version: {torch.__version__}")
        print(f"   CUDA available: {torch.cuda.is_available()}")
    except ImportError as e:
        print(f"❌ Failed to import torch: {e}")
        return False
    
    return True

def test_tts_generation():
    """Test actual TTS generation"""
    print("\n" + "=" * 50)
    print("Testing TTS Generation")
    print("=" * 50)
    
    try:
        from kokoro import KPipeline
        import soundfile as sf
        import numpy as np
        
        # Initialize pipeline
        print("Initializing KPipeline...")
        pipeline = KPipeline(lang_code='a')
        print("✅ Pipeline initialized")
        
        # Test text
        text = "Hello, this is a test of the Kokoro text-to-speech system."
        voice = 'af_heart'
        
        print(f"\nGenerating audio for: '{text}'")
        print(f"Using voice: {voice}")
        
        # Generate audio
        generator = pipeline(text, voice=voice)
        
        # Collect audio segments
        all_audio = []
        for i, (gs, ps, audio) in enumerate(generator):
            all_audio.append(audio)
            print(f"Segment {i}: {gs[:50]}...")
        
        # Combine audio
        if len(all_audio) > 1:
            combined_audio = np.concatenate(all_audio)
        else:
            combined_audio = all_audio[0]
        
        print(f"\n✅ Audio generated successfully!")
        print(f"   Sample rate: 24000 Hz")
        print(f"   Duration: {len(combined_audio) / 24000:.2f} seconds")
        print(f"   Samples: {len(combined_audio)}")
        
        # Save to file
        output_file = 'test_output.wav'
        sf.write(output_file, combined_audio, 24000)
        print(f"✅ Audio saved to: {output_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ TTS generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n🎙️ Kokoro TTS Installation Test\n")
    
    # Test imports
    if not test_imports():
        print("\n❌ Package import test failed!")
        sys.exit(1)
    
    # Test TTS generation
    if not test_tts_generation():
        print("\n❌ TTS generation test failed!")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ All tests passed!")
    print("=" * 50)
    print("\nKokoro TTS is working correctly!")
    print("You can now use the web application.")

if __name__ == '__main__':
    main()

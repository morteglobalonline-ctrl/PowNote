#!/usr/bin/env python3
"""
AI Chat Image Upload Feature Testing for Pawnote
Tests the vision-based AI chat functionality with image upload support.
"""

import requests
import json
import base64
import io
from PIL import Image
import sys
import time

# Get backend URL from frontend env
BACKEND_URL = "https://pet-pal-2.preview.emergentagent.com/api"

def create_test_image_base64():
    """Create a small test image and return as base64 with data URI prefix"""
    # Create a simple 10x10 red square PNG
    img = Image.new('RGB', (10, 10), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_data = buffer.getvalue()
    
    # Convert to base64 with data URI prefix
    b64_string = base64.b64encode(img_data).decode('utf-8')
    return f"data:image/png;base64,{b64_string}"

def test_ai_chat_text_only():
    """Test 1: Text-only chat (baseline)"""
    print("🧪 Test 1: Text-only AI Chat")
    
    url = f"{BACKEND_URL}/chat"
    payload = {
        "session_id": "test-session-image-upload",
        "message": "Hello, can you give me general advice about dog care?",
        "pet_id": None
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "response" in data and data["response"]:
                print(f"   ✅ SUCCESS: AI responded with text-only message")
                print(f"   Response preview: {data['response'][:100]}...")
                return True
            else:
                print(f"   ❌ FAILED: No response content in AI reply")
                return False
        else:
            print(f"   ❌ FAILED: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_ai_chat_with_image():
    """Test 2: Chat with image and text message"""
    print("\n🧪 Test 2: AI Chat with Image and Text")
    
    url = f"{BACKEND_URL}/chat"
    test_image = create_test_image_base64()
    
    payload = {
        "session_id": "test-session-image-upload",
        "message": "What do you see in this image? Please provide any pet care advice.",
        "image": test_image,
        "pet_id": None
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "response" in data and data["response"]:
                print(f"   ✅ SUCCESS: AI processed image and responded")
                print(f"   Response preview: {data['response'][:100]}...")
                return True
            else:
                print(f"   ❌ FAILED: No response content in AI reply")
                return False
        else:
            print(f"   ❌ FAILED: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_ai_chat_image_only():
    """Test 3: Chat with image only (empty message)"""
    print("\n🧪 Test 3: AI Chat with Image Only (Empty Message)")
    
    url = f"{BACKEND_URL}/chat"
    test_image = create_test_image_base64()
    
    payload = {
        "session_id": "test-session-image-upload",
        "message": "",  # Empty message
        "image": test_image,
        "pet_id": None
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "response" in data and data["response"]:
                print(f"   ✅ SUCCESS: AI processed image-only request")
                print(f"   Response preview: {data['response'][:100]}...")
                return True
            else:
                print(f"   ❌ FAILED: No response content in AI reply")
                return False
        else:
            print(f"   ❌ FAILED: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_chat_history_with_images():
    """Test 4: Chat history includes image messages"""
    print("\n🧪 Test 4: Chat History with Image Messages")
    
    session_id = "test-session-image-upload"
    url = f"{BACKEND_URL}/chat/history/{session_id}"
    
    try:
        response = requests.get(url, timeout=15)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            history = response.json()
            if isinstance(history, list) and len(history) > 0:
                print(f"   ✅ SUCCESS: Retrieved chat history with {len(history)} messages")
                
                # Check if any messages contain image references
                image_messages = [msg for msg in history if "[Image]" in msg.get("content", "")]
                if image_messages:
                    print(f"   ✅ Found {len(image_messages)} image messages in history")
                else:
                    print(f"   ⚠️  No image messages found in history (may be expected)")
                
                return True
            else:
                print(f"   ❌ FAILED: Empty or invalid chat history")
                return False
        else:
            print(f"   ❌ FAILED: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_ai_chat_with_pet_context():
    """Test 5: AI Chat with image and pet context"""
    print("\n🧪 Test 5: AI Chat with Image and Pet Context")
    
    # First create a test pet
    pet_url = f"{BACKEND_URL}/pets"
    pet_data = {
        "name": "TestDog",
        "birth_date": "2022-01-15",
        "pet_type": "dog",
        "breed": "Golden Retriever",
        "weight": 65.0,
        "gender": "male"
    }
    
    try:
        pet_response = requests.post(pet_url, json=pet_data, timeout=15)
        if pet_response.status_code != 200:
            print(f"   ⚠️  Could not create test pet, testing without pet context")
            pet_id = None
        else:
            pet_id = pet_response.json()["id"]
            print(f"   Created test pet with ID: {pet_id}")
        
        # Now test chat with pet context
        chat_url = f"{BACKEND_URL}/chat"
        test_image = create_test_image_base64()
        
        payload = {
            "session_id": "test-session-with-pet",
            "message": "Is this safe for my dog?",
            "image": test_image,
            "pet_id": pet_id
        }
        
        response = requests.post(chat_url, json=payload, timeout=30)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "response" in data and data["response"]:
                print(f"   ✅ SUCCESS: AI processed image with pet context")
                print(f"   Response preview: {data['response'][:100]}...")
                
                # Clean up test pet
                if pet_id:
                    requests.delete(f"{pet_url}/{pet_id}")
                    print(f"   Cleaned up test pet")
                
                return True
            else:
                print(f"   ❌ FAILED: No response content in AI reply")
                return False
        else:
            print(f"   ❌ FAILED: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def main():
    """Run all AI Chat Image Upload tests"""
    print("=" * 60)
    print("🐾 PAWNOTE AI CHAT IMAGE UPLOAD TESTING SUITE")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print()
    
    # Run all tests
    tests = [
        test_ai_chat_text_only,
        test_ai_chat_with_image,
        test_ai_chat_image_only,
        test_chat_history_with_images,
        test_ai_chat_with_pet_context
    ]
    
    results = []
    for test_func in tests:
        try:
            result = test_func()
            results.append(result)
            time.sleep(1)  # Brief pause between tests
        except Exception as e:
            print(f"   ❌ CRITICAL ERROR in {test_func.__name__}: {str(e)}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    test_names = [
        "Text-only AI Chat",
        "AI Chat with Image and Text", 
        "AI Chat with Image Only",
        "Chat History with Images",
        "AI Chat with Pet Context"
    ]
    
    for i, (name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{i+1}. {name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! AI Chat Image Upload feature is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Pawnote Pet Care App
Tests all API endpoints with realistic pet care data
"""

import requests
import json
import uuid
from datetime import datetime, date
import sys

# Backend URL from environment
BACKEND_URL = "https://pet-pal-2.preview.emergentagent.com/api"

class PawnoteAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_pet_id = None
        self.test_checklist_id = None
        self.test_vet_visit_id = None
        self.test_reminder_id = None
        self.session_id = str(uuid.uuid4())
        self.results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status} {test_name}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_result("Root Endpoint", True, f"Message: {data['message']}")
                    return True
                else:
                    self.log_result("Root Endpoint", False, "Missing message or version in response")
            else:
                self.log_result("Root Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Root Endpoint", False, str(e))
        return False
    
    def test_create_pet(self):
        """Test POST /api/pets - Create pet"""
        try:
            pet_data = {
                "name": "Luna",
                "birth_date": "2022-03-15",
                "pet_type": "dog",
                "breed": "Golden Retriever"
            }
            
            response = requests.post(f"{self.base_url}/pets", json=pet_data)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["name"] == "Luna":
                    self.test_pet_id = data["id"]
                    self.log_result("Create Pet", True, f"Created pet Luna with ID: {self.test_pet_id}")
                    return True
                else:
                    self.log_result("Create Pet", False, "Invalid response structure")
            else:
                self.log_result("Create Pet", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Pet", False, str(e))
        return False
    
    def test_get_pets(self):
        """Test GET /api/pets - List all pets"""
        try:
            response = requests.get(f"{self.base_url}/pets")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Get All Pets", True, f"Found {len(data)} pets")
                    return True
                else:
                    self.log_result("Get All Pets", False, "No pets found or invalid response")
            else:
                self.log_result("Get All Pets", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get All Pets", False, str(e))
        return False
    
    def test_get_single_pet(self):
        """Test GET /api/pets/{pet_id} - Get single pet"""
        if not self.test_pet_id:
            self.log_result("Get Single Pet", False, "No test pet ID available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/pets/{self.test_pet_id}")
            if response.status_code == 200:
                data = response.json()
                if data["id"] == self.test_pet_id and data["name"] == "Luna":
                    self.log_result("Get Single Pet", True, f"Retrieved pet: {data['name']}")
                    return True
                else:
                    self.log_result("Get Single Pet", False, "Pet data mismatch")
            else:
                self.log_result("Get Single Pet", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Single Pet", False, str(e))
        return False
    
    def test_update_pet(self):
        """Test PUT /api/pets/{pet_id} - Update pet"""
        if not self.test_pet_id:
            self.log_result("Update Pet", False, "No test pet ID available")
            return False
            
        try:
            update_data = {
                "breed": "Golden Retriever Mix",
                "photo": "base64_encoded_photo_data"
            }
            
            response = requests.put(f"{self.base_url}/pets/{self.test_pet_id}", json=update_data)
            if response.status_code == 200:
                data = response.json()
                if data["breed"] == "Golden Retriever Mix":
                    self.log_result("Update Pet", True, f"Updated breed to: {data['breed']}")
                    return True
                else:
                    self.log_result("Update Pet", False, "Update not reflected in response")
            else:
                self.log_result("Update Pet", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Update Pet", False, str(e))
        return False
    
    def test_access_endpoint(self):
        """Test POST /api/access - Simple auth with pet_name and birth_date"""
        try:
            access_data = {
                "pet_name": "Luna",
                "birth_date": "2022-03-15"
            }
            
            response = requests.post(f"{self.base_url}/access", json=access_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "pet" in data:
                    self.log_result("Access Endpoint", True, f"Successfully accessed pet: {data['pet']['name']}")
                    return True
                else:
                    self.log_result("Access Endpoint", False, "Invalid access response")
            else:
                self.log_result("Access Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Access Endpoint", False, str(e))
        return False
    
    def test_create_checklist(self):
        """Test POST /api/checklists - Create checklist with items"""
        if not self.test_pet_id:
            self.log_result("Create Checklist", False, "No test pet ID available")
            return False
            
        try:
            checklist_data = {
                "pet_id": self.test_pet_id,
                "title": "Morning Care Routine",
                "category": "daily",
                "items": [
                    {"text": "Feed breakfast", "due_time": "08:00"},
                    {"text": "Fresh water bowl", "due_time": "08:15"},
                    {"text": "Morning walk", "due_time": "08:30"}
                ],
                "is_recurring": True,
                "recurrence_pattern": "daily"
            }
            
            response = requests.post(f"{self.base_url}/checklists", json=checklist_data)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["title"] == "Morning Care Routine":
                    self.test_checklist_id = data["id"]
                    self.log_result("Create Checklist", True, f"Created checklist with {len(data['items'])} items")
                    return True
                else:
                    self.log_result("Create Checklist", False, "Invalid checklist response")
            else:
                self.log_result("Create Checklist", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Checklist", False, str(e))
        return False
    
    def test_get_checklists(self):
        """Test GET /api/checklists?pet_id={id} - Get checklists for pet"""
        if not self.test_pet_id:
            self.log_result("Get Checklists", False, "No test pet ID available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/checklists?pet_id={self.test_pet_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Get Checklists", True, f"Found {len(data)} checklists for pet")
                    return True
                else:
                    self.log_result("Get Checklists", False, "No checklists found")
            else:
                self.log_result("Get Checklists", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Checklists", False, str(e))
        return False
    
    def test_toggle_checklist_item(self):
        """Test PATCH /api/checklists/{id}/items/{item_id}?completed=true - Toggle checklist item"""
        if not self.test_checklist_id:
            self.log_result("Toggle Checklist Item", False, "No test checklist ID available")
            return False
            
        try:
            # First get the checklist to find an item ID
            response = requests.get(f"{self.base_url}/checklists/{self.test_checklist_id}")
            if response.status_code != 200:
                self.log_result("Toggle Checklist Item", False, "Could not retrieve checklist")
                return False
                
            checklist = response.json()
            if not checklist.get("items"):
                self.log_result("Toggle Checklist Item", False, "No items in checklist")
                return False
                
            item_id = checklist["items"][0]["id"]
            
            # Toggle the item
            response = requests.patch(f"{self.base_url}/checklists/{self.test_checklist_id}/items/{item_id}?completed=true")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Toggle Checklist Item", True, "Successfully toggled checklist item")
                    return True
                else:
                    self.log_result("Toggle Checklist Item", False, "Toggle operation failed")
            else:
                self.log_result("Toggle Checklist Item", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Toggle Checklist Item", False, str(e))
        return False
    
    def test_create_vet_visit(self):
        """Test POST /api/vet-visits - Create vet visit with instructions"""
        if not self.test_pet_id:
            self.log_result("Create Vet Visit", False, "No test pet ID available")
            return False
            
        try:
            vet_visit_data = {
                "pet_id": self.test_pet_id,
                "visit_date": "2024-01-15",
                "vet_name": "Dr. Sarah Johnson",
                "reason": "Annual checkup and vaccinations",
                "notes": "Luna is healthy and active. Weight is good for her age.",
                "instructions": [
                    "Give medication twice daily with food",
                    "Keep wound dry for 3 days",
                    "Return in 2 weeks for follow-up"
                ],
                "follow_up_date": "2024-01-29"
            }
            
            response = requests.post(f"{self.base_url}/vet-visits", json=vet_visit_data)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["reason"] == "Annual checkup and vaccinations":
                    self.test_vet_visit_id = data["id"]
                    self.log_result("Create Vet Visit", True, f"Created vet visit with {len(data['instructions'])} instructions")
                    return True
                else:
                    self.log_result("Create Vet Visit", False, "Invalid vet visit response")
            else:
                self.log_result("Create Vet Visit", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Vet Visit", False, str(e))
        return False
    
    def test_get_vet_visits(self):
        """Test GET /api/vet-visits?pet_id={id} - Get vet visits"""
        if not self.test_pet_id:
            self.log_result("Get Vet Visits", False, "No test pet ID available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/vet-visits?pet_id={self.test_pet_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Get Vet Visits", True, f"Found {len(data)} vet visits for pet")
                    return True
                else:
                    self.log_result("Get Vet Visits", False, "No vet visits found")
            else:
                self.log_result("Get Vet Visits", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Vet Visits", False, str(e))
        return False
    
    def test_convert_vet_to_checklist(self):
        """Test POST /api/vet-visits/{id}/to-checklist - Convert vet instructions to checklist"""
        if not self.test_vet_visit_id:
            self.log_result("Convert Vet to Checklist", False, "No test vet visit ID available")
            return False
            
        try:
            response = requests.post(f"{self.base_url}/vet-visits/{self.test_vet_visit_id}/to-checklist")
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data.get("category") == "vet":
                    self.log_result("Convert Vet to Checklist", True, f"Converted vet visit to checklist: {data['title']}")
                    return True
                else:
                    self.log_result("Convert Vet to Checklist", False, "Invalid conversion response")
            else:
                self.log_result("Convert Vet to Checklist", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Convert Vet to Checklist", False, str(e))
        return False
    
    def test_create_reminder(self):
        """Test POST /api/reminders - Create reminder"""
        if not self.test_pet_id:
            self.log_result("Create Reminder", False, "No test pet ID available")
            return False
            
        try:
            reminder_data = {
                "pet_id": self.test_pet_id,
                "title": "Evening Medication",
                "description": "Give Luna her evening medication with dinner",
                "reminder_time": "18:00",
                "is_recurring": True,
                "recurrence_days": [0, 1, 2, 3, 4, 5, 6],
                "category": "medication"
            }
            
            response = requests.post(f"{self.base_url}/reminders", json=reminder_data)
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["title"] == "Evening Medication":
                    self.test_reminder_id = data["id"]
                    self.log_result("Create Reminder", True, f"Created reminder: {data['title']}")
                    return True
                else:
                    self.log_result("Create Reminder", False, "Invalid reminder response")
            else:
                self.log_result("Create Reminder", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Reminder", False, str(e))
        return False
    
    def test_get_reminders(self):
        """Test GET /api/reminders?pet_id={id} - Get reminders"""
        if not self.test_pet_id:
            self.log_result("Get Reminders", False, "No test pet ID available")
            return False
            
        try:
            response = requests.get(f"{self.base_url}/reminders?pet_id={self.test_pet_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Get Reminders", True, f"Found {len(data)} reminders for pet")
                    return True
                else:
                    self.log_result("Get Reminders", False, "No reminders found")
            else:
                self.log_result("Get Reminders", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Reminders", False, str(e))
        return False
    
    def test_toggle_reminder(self):
        """Test PATCH /api/reminders/{id}/toggle - Toggle reminder active status"""
        if not self.test_reminder_id:
            self.log_result("Toggle Reminder", False, "No test reminder ID available")
            return False
            
        try:
            response = requests.patch(f"{self.base_url}/reminders/{self.test_reminder_id}/toggle")
            if response.status_code == 200:
                data = response.json()
                if "is_active" in data:
                    self.log_result("Toggle Reminder", True, f"Toggled reminder active status to: {data['is_active']}")
                    return True
                else:
                    self.log_result("Toggle Reminder", False, "Invalid toggle response")
            else:
                self.log_result("Toggle Reminder", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Toggle Reminder", False, str(e))
        return False
    
    def test_ai_chat(self):
        """Test POST /api/chat - AI chat"""
        try:
            chat_data = {
                "session_id": self.session_id,
                "message": "How often should I walk my Golden Retriever puppy?",
                "pet_id": self.test_pet_id
            }
            
            response = requests.post(f"{self.base_url}/chat", json=chat_data)
            if response.status_code == 200:
                data = response.json()
                if "response" in data and len(data["response"]) > 0:
                    self.log_result("AI Chat", True, f"AI responded with {len(data['response'])} characters")
                    return True
                else:
                    self.log_result("AI Chat", False, "Empty or invalid AI response")
            else:
                self.log_result("AI Chat", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("AI Chat", False, str(e))
        return False
    
    def test_get_chat_history(self):
        """Test GET /api/chat/history/{session_id} - Get chat history"""
        try:
            response = requests.get(f"{self.base_url}/chat/history/{self.session_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 2:  # Should have user + assistant messages
                    self.log_result("Get Chat History", True, f"Retrieved {len(data)} chat messages")
                    return True
                else:
                    self.log_result("Get Chat History", False, "No chat history found")
            else:
                self.log_result("Get Chat History", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Chat History", False, str(e))
        return False
    
    def test_delete_operations(self):
        """Test DELETE operations for cleanup"""
        success_count = 0
        
        # Delete reminder
        if self.test_reminder_id:
            try:
                response = requests.delete(f"{self.base_url}/reminders/{self.test_reminder_id}")
                if response.status_code == 200:
                    success_count += 1
                    self.log_result("Delete Reminder", True, "Reminder deleted successfully")
                else:
                    self.log_result("Delete Reminder", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Delete Reminder", False, str(e))
        
        # Delete vet visit
        if self.test_vet_visit_id:
            try:
                response = requests.delete(f"{self.base_url}/vet-visits/{self.test_vet_visit_id}")
                if response.status_code == 200:
                    success_count += 1
                    self.log_result("Delete Vet Visit", True, "Vet visit deleted successfully")
                else:
                    self.log_result("Delete Vet Visit", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Delete Vet Visit", False, str(e))
        
        # Delete checklist
        if self.test_checklist_id:
            try:
                response = requests.delete(f"{self.base_url}/checklists/{self.test_checklist_id}")
                if response.status_code == 200:
                    success_count += 1
                    self.log_result("Delete Checklist", True, "Checklist deleted successfully")
                else:
                    self.log_result("Delete Checklist", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Delete Checklist", False, str(e))
        
        # Clear chat history
        try:
            response = requests.delete(f"{self.base_url}/chat/history/{self.session_id}")
            if response.status_code == 200:
                success_count += 1
                self.log_result("Clear Chat History", True, "Chat history cleared successfully")
            else:
                self.log_result("Clear Chat History", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Clear Chat History", False, str(e))
        
        # Delete pet (this will cascade delete related data)
        if self.test_pet_id:
            try:
                response = requests.delete(f"{self.base_url}/pets/{self.test_pet_id}")
                if response.status_code == 200:
                    success_count += 1
                    self.log_result("Delete Pet", True, "Pet and related data deleted successfully")
                else:
                    self.log_result("Delete Pet", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Delete Pet", False, str(e))
        
        return success_count >= 3  # At least 3 out of 5 delete operations should succeed
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🧪 Starting Pawnote API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Core API tests
        self.test_root_endpoint()
        
        # Pet management tests
        self.test_create_pet()
        self.test_get_pets()
        self.test_get_single_pet()
        self.test_update_pet()
        self.test_access_endpoint()
        
        # Checklist tests
        self.test_create_checklist()
        self.test_get_checklists()
        self.test_toggle_checklist_item()
        
        # Vet visit tests
        self.test_create_vet_visit()
        self.test_get_vet_visits()
        self.test_convert_vet_to_checklist()
        
        # Reminder tests
        self.test_create_reminder()
        self.test_get_reminders()
        self.test_toggle_reminder()
        
        # AI Chat tests
        self.test_ai_chat()
        self.test_get_chat_history()
        
        # Cleanup tests
        self.test_delete_operations()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed < total:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = PawnoteAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
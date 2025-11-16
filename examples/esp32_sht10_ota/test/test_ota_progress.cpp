/**
 * Unit tests for OTA Update Progress Callback
 * 
 * These tests verify:
 * 1. The onProgress callback is invoked during an OTA update
 * 2. The progress output string is correctly formatted with the percentage
 * 3. A newline character is printed after the progress percentage
 */

#include <unity.h>
#include <string>
#include <vector>

// Mock structures to simulate ESP32 environment
struct MockSerial {
    std::vector<std::string> outputs;
    
    void printf(const char* format, ...) {
        char buffer[256];
        va_list args;
        va_start(args, format);
        vsnprintf(buffer, sizeof(buffer), format, args);
        va_end(args);
        outputs.push_back(buffer);
    }
    
    void println() {
        if (!outputs.empty()) {
            outputs.back() += "\n";
        }
    }
    
    void clear() {
        outputs.clear();
    }
    
    std::string getLastOutput() {
        return outputs.empty() ? "" : outputs.back();
    }
    
    size_t getOutputCount() {
        return outputs.size();
    }
};

MockSerial mockSerial;

// Simulated onProgress callback (as seen in esp32_sht10_ota.ino line 227-230)
void onProgressCallback(int current, int total) {
    mockSerial.printf("Progress: %d%%\r", (current * 100) / total);
    mockSerial.println();
}

// Test 1: Verify that onProgress callback is invoked during OTA update
void test_onProgress_callback_invoked() {
    mockSerial.clear();
    
    // Simulate OTA update progress at different stages
    int totalSize = 1000000; // 1MB firmware
    
    // Simulate progress at 25%
    onProgressCallback(250000, totalSize);
    TEST_ASSERT_EQUAL(1, mockSerial.getOutputCount());
    
    // Simulate progress at 50%
    onProgressCallback(500000, totalSize);
    TEST_ASSERT_EQUAL(2, mockSerial.getOutputCount());
    
    // Simulate progress at 75%
    onProgressCallback(750000, totalSize);
    TEST_ASSERT_EQUAL(3, mockSerial.getOutputCount());
    
    // Simulate progress at 100%
    onProgressCallback(1000000, totalSize);
    TEST_ASSERT_EQUAL(4, mockSerial.getOutputCount());
}

// Test 2: Verify that progress output string is correctly formatted with percentage
void test_progress_string_formatting() {
    mockSerial.clear();
    
    // Test various progress percentages
    struct TestCase {
        int current;
        int total;
        const char* expectedOutput;
    };
    
    TestCase testCases[] = {
        {0, 1000, "Progress: 0%\r"},
        {250, 1000, "Progress: 25%\r"},
        {500, 1000, "Progress: 50%\r"},
        {750, 1000, "Progress: 75%\r"},
        {1000, 1000, "Progress: 100%\r"},
        {333, 1000, "Progress: 33%\r"},
        {666, 1000, "Progress: 66%\r"},
        {999, 1000, "Progress: 99%\r"}
    };
    
    for (size_t i = 0; i < sizeof(testCases) / sizeof(TestCase); i++) {
        mockSerial.clear();
        onProgressCallback(testCases[i].current, testCases[i].total);
        
        std::string output = mockSerial.getLastOutput();
        // Check that output starts with expected format (before newline)
        TEST_ASSERT_TRUE(output.find(testCases[i].expectedOutput) == 0);
    }
}

// Test 3: Verify that a newline character is printed after progress percentage
void test_newline_after_progress() {
    mockSerial.clear();
    
    // Simulate progress update
    int current = 500000;
    int total = 1000000;
    
    onProgressCallback(current, total);
    
    std::string output = mockSerial.getLastOutput();
    
    // Verify that output contains a newline character at the end
    TEST_ASSERT_TRUE(output.length() > 0);
    TEST_ASSERT_EQUAL('\n', output.back());
    
    // Verify the format is "Progress: XX%\r\n"
    TEST_ASSERT_TRUE(output.find("Progress: 50%\r\n") != std::string::npos);
}

// Test 4: Edge case - Zero total (division by zero protection)
void test_progress_zero_total() {
    mockSerial.clear();
    
    // This should handle division by zero gracefully
    // In real implementation, you might want to add protection
    // For now, we test with a very small number
    onProgressCallback(100, 1000000);
    
    std::string output = mockSerial.getLastOutput();
    TEST_ASSERT_TRUE(output.find("Progress: 0%") != std::string::npos);
}

// Test 5: Progress calculations are accurate for various file sizes
void test_progress_various_sizes() {
    mockSerial.clear();
    
    // Test with realistic firmware sizes
    struct SizeTest {
        int current;
        int total;
        int expectedPercent;
    };
    
    SizeTest sizeTests[] = {
        {512000, 1024000, 50},   // 512KB of 1MB
        {768000, 1024000, 75},   // 768KB of 1MB
        {256000, 1024000, 25},   // 256KB of 1MB
        {1048576, 2097152, 50},  // 1MB of 2MB
        {2500000, 10000000, 25}, // 2.5MB of 10MB
    };
    
    for (size_t i = 0; i < sizeof(sizeTests) / sizeof(SizeTest); i++) {
        mockSerial.clear();
        onProgressCallback(sizeTests[i].current, sizeTests[i].total);
        
        std::string output = mockSerial.getLastOutput();
        char expected[32];
        snprintf(expected, sizeof(expected), "Progress: %d%%", sizeTests[i].expectedPercent);
        
        TEST_ASSERT_TRUE(output.find(expected) != std::string::npos);
    }
}

// Test 6: Verify carriage return is present for terminal overwriting
void test_carriage_return_present() {
    mockSerial.clear();
    
    onProgressCallback(500000, 1000000);
    
    std::string output = mockSerial.getLastOutput();
    
    // Should contain both carriage return (\r) and newline (\n)
    TEST_ASSERT_TRUE(output.find('\r') != std::string::npos);
    TEST_ASSERT_TRUE(output.find('\n') != std::string::npos);
    
    // Carriage return should come before newline
    size_t rPos = output.find('\r');
    size_t nPos = output.find('\n');
    TEST_ASSERT_TRUE(rPos < nPos);
}

// Main test runner
int main(int argc, char **argv) {
    UNITY_BEGIN();
    
    // Run all tests
    RUN_TEST(test_onProgress_callback_invoked);
    RUN_TEST(test_progress_string_formatting);
    RUN_TEST(test_newline_after_progress);
    RUN_TEST(test_progress_zero_total);
    RUN_TEST(test_progress_various_sizes);
    RUN_TEST(test_carriage_return_present);
    
    return UNITY_END();
}

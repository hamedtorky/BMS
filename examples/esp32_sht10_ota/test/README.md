# OTA Progress Callback Unit Tests

This directory contains unit tests for the OTA (Over-The-Air) update progress callback functionality.

## Test Coverage

The test suite (`test_ota_progress.cpp`) covers the following scenarios:

### 1. **onProgress Callback Invocation** (`test_onProgress_callback_invoked`)
- Verifies that the `onProgress` callback is invoked during an OTA update
- Tests callback invocation at multiple progress stages (25%, 50%, 75%, 100%)
- Ensures the callback is called the correct number of times

### 2. **Progress String Formatting** (`test_progress_string_formatting`)
- Validates that the progress output string is correctly formatted with the percentage
- Tests various percentages: 0%, 25%, 33%, 50%, 66%, 75%, 99%, 100%
- Ensures the format follows: `Progress: XX%\r`

### 3. **Newline Character Output** (`test_newline_after_progress`)
- Confirms that a newline character (`\n`) is printed after the progress percentage
- Validates the complete output format: `Progress: XX%\r\n`
- Ensures proper line ending for serial output

### 4. **Edge Cases** (`test_progress_zero_total`)
- Tests behavior with very small progress values
- Ensures calculations don't fail with edge case inputs

### 5. **Various File Sizes** (`test_progress_various_sizes`)
- Validates accurate progress calculations for realistic firmware sizes
- Tests with sizes ranging from 256KB to 10MB
- Ensures percentage calculations are correct for different file sizes

### 6. **Carriage Return Handling** (`test_carriage_return_present`)
- Verifies that a carriage return (`\r`) is present for terminal overwriting
- Ensures proper sequence: `\r` before `\n`
- Important for progress bar functionality in terminals

## Running the Tests

### Prerequisites

1. Install PlatformIO:
   ```bash
   pip install platformio
   ```

2. Navigate to the project directory:
   ```bash
   cd /Users/hamed/Documents/ws/BMS-server/examples/esp32_sht10_ota
   ```

### Run All Tests

```bash
pio test -e native
```

### Run Specific Test

```bash
pio test -e native -f test_ota_progress
```

### Verbose Output

```bash
pio test -e native -v
```

## Test Architecture

The tests use a **mock-based approach** to simulate the ESP32 Serial interface:

- **MockSerial**: A mock class that captures `Serial.printf()` and `Serial.println()` calls
- **onProgressCallback**: A test implementation of the OTA progress callback that matches the actual implementation in `esp32_sht10_ota.ino` (lines 227-230)

This approach allows testing the callback logic without requiring actual hardware or OTA updates.

## Expected Output

When tests pass, you should see output similar to:

```
test/test_ota_progress.cpp:197: test_onProgress_callback_invoked [PASSED]
test/test_ota_progress.cpp:198: test_progress_string_formatting [PASSED]
test/test_ota_progress.cpp:199: test_newline_after_progress [PASSED]
test/test_ota_progress.cpp:200: test_progress_zero_total [PASSED]
test/test_ota_progress.cpp:201: test_progress_various_sizes [PASSED]
test/test_ota_progress.cpp:202: test_carriage_return_present [PASSED]

6 Tests 0 Failures 0 Ignored
OK
```

## Integration with Actual Code

The test implementation mirrors the actual OTA progress callback in `esp32_sht10_ota.ino`:

```cpp
// Actual implementation (lines 227-230)
httpUpdate.onProgress([](int current, int total) {
    Serial.printf("Progress: %d%%\r", (current * 100) / total);
    Serial.println();
});
```

The tests validate that this implementation:
1. Is called during OTA updates
2. Formats the progress string correctly
3. Outputs a newline after the percentage

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run PlatformIO Tests
  run: pio test -e native
```

## Troubleshooting

### Test Compilation Errors

If you encounter compilation errors, ensure:
- PlatformIO is up to date: `pio upgrade`
- Dependencies are installed: `pio lib install`

### Test Failures

If tests fail:
1. Check that the mock implementation matches the actual callback
2. Verify the format string in the actual code hasn't changed
3. Run tests with verbose output: `pio test -e native -v`

## Contributing

When modifying the OTA progress callback:
1. Update the test implementation to match
2. Add new test cases for new functionality
3. Ensure all tests pass before committing

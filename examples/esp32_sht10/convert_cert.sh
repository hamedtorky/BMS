#!/bin/bash
#
# Convert CA certificate to Arduino-compatible format
# Usage: ./convert_cert.sh
#

CERT_PATH="../../mosquitto/certs/ca.crt"

if [ ! -f "$CERT_PATH" ]; then
    echo "Error: CA certificate not found at $CERT_PATH"
    exit 1
fi

echo "Converting certificate to Arduino format..."
echo ""
echo "Copy this into your Arduino sketch (replace the ca_cert variable):"
echo ""
echo "const char* ca_cert = \\"

# Read certificate and format for C string
while IFS= read -r line; do
    echo "\"$line\\n\" \\"
done < "$CERT_PATH"

echo "\"\";"
echo ""
echo "Done! Copy the above text into your esp32_sht10.ino file"

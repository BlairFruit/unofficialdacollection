const fs = require('fs');
const path = require('path');

// Tell the script where your data and media are
const dataPath = path.join(__dirname, 'assets', 'data.json');
const mediaDir = path.join(__dirname, 'assets', 'media');

// Read the data.json file
let rawData = fs.readFileSync(dataPath, 'utf8');
let data = JSON.parse(rawData);

// Loop through every page
for (let pageNum in data.pages) {
    
    // We create a counter that resets to 1 at the start of every new page!
    let assetCounter = 1; 

    data.pages[pageNum].forEach(block => {
        // If the block is an image or video, process it
        if (block.type === 'image' || block.type === 'video') {
            let oldRelPath = block.value; 
            
            // Get the file extension (like .png, .gif, .mp4)
            let ext = path.extname(oldRelPath);
            
            // CREATE THE NEW SMART NAME (e.g., "p12-1.png")
            let newFilename = `p${pageNum}-${assetCounter}${ext}`;
            let newRelPath = `assets/media/${newFilename}`;
            
            // Figure out the actual computer paths
            let oldFilePath = path.join(__dirname, oldRelPath);
            let newFilePath = path.join(__dirname, newRelPath);
            
            // Rename the physical file on your hard drive
            if (fs.existsSync(oldFilePath)) {
                fs.renameSync(oldFilePath, newFilePath);
                console.log(`Renamed: ${path.basename(oldRelPath)}  ->  ${newFilename}`);
            } else {
                console.log(`COULD NOT FIND: ${path.basename(oldRelPath)}`);
            }
            
            // Update the JSON data with the new clean path
            block.value = newRelPath;
            
            // Increase the counter for the NEXT asset on this specific page
            assetCounter++;
        }
    });
}

// Save the updated data.json
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log("\nAll done! data.json has been updated with the p#-X format.");
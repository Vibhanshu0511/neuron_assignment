const fs = require('fs');
const parse = require('csv-parser');
const mongoose = require('mongoose');
const ShipModel = require('./ship_model'); // Import your Mongoose schema
const express = require('express');
const cors=require('cors');
// Function to convert coordinates to GeoJSON Point
const app=express();

// function convertToGeoJSON(latitude, longitude) {
//     return {
//         type: 'Point',
//         coordinates: [parseFloat(longitude), parseFloat(latitude)]
//     };
// }

app.use(cors({
    origin: 'http://localhost:3000', // Change the port to match your frontend port
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  }));

// Function to determine line style based on timestamp range
// function getLineStyle(endDate, timestamp) {
//     const twoDaysAgo = new Date(endDate);
//     twoDaysAgo.setDate(twoDaysAgo.getDate() - 2); // Calculate timestamp for 2 days before the end date
//     const sevenDaysAgo = new Date(endDate);
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // Calculate timestamp for 7 days before the end date

//     if (timestamp >= twoDaysAgo) {
//         return 'solid';
//     } else if (timestamp >= sevenDaysAgo) {
//         return 'dotted';
//     } else {
//         return 'dashed';
//     }
// }

function getLineStyle(timestamp) {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    if (timestamp >= twoDaysAgo) {
        return 'solid';
    } else if (timestamp >= sevenDaysAgo) {
        return 'dotted';
    } else {
        return 'dashed';
    }
}

async function processAndSaveData(filePath) {
    const ships = {}; // Object to store ship data with arrays of coordinates
    const data_ships=[];

    // Read the CSV file and parse each row
    fs.createReadStream(filePath)
        .pipe(parse())
        .on('data', row => {
            const shipName = row.site_name;
            const latitude = parseFloat(row.location_latitude);
            const longitude = parseFloat(row.location_longitude);
            const timestampString = row.ec_timestamp;

            if (isNaN(latitude) || isNaN(longitude)) {
                console.warn(`Skipping entry for ${shipName} due to missing latitude or longitude.`);
                return; // Skip this entry if latitude or longitude is missing
            }

            const timestamp = new Date(Date.parse(timestampString));
            const coordinates = [parseFloat(longitude), parseFloat(latitude)]; // Convert coordinates to GeoJSON format

            if (!ships[shipName]) {
                ships[shipName] = [];
            }

            ships[shipName].push({ coordinates, timestamp }); // Add coordinates and timestamp to the ship's array
        })
        .on('end', async () => {
            // Create features for each ship and save ship data to MongoDB
            try {
                for (const shipName in ships) {
                    const shipCoordinates = ships[shipName].map(({ coordinates }) => coordinates);
                    const latestTimestamp = ships[shipName][ships[shipName].length - 1].timestamp;
                    const lineStyle = getLineStyle(latestTimestamp); // Get line style based on the latest timestamp
                    // console.log("-----------------------------------------------------:", ships[shipName]);
                    const features = [{
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: shipCoordinates
                        },
                        properties: {
                            style: lineStyle // Assign the calculated line style
                        }
                    }];
                    data_ships.push({ shipName, route: { type: 'FeatureCollection', features } });
                }
                await ShipModel.insertMany(data_ships);
                console.log('Ship data saved successfully to MongoDB');
            } catch (error) {
                console.error('Error saving ship data to MongoDB:', error);
            }
        });
}

const filePath = './geo.csv';

app.get('/ships', async (req, res) => {
    try {
        const ships = await ShipModel.find(); // Retrieve all ship data from the database
        res.json(ships); // Respond with the ship data as JSON
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' }); // Handle any errors
    }
});

app.get('/ships/:shipName', async (req, res) => {
    const shipName = req.params.shipName; // Get the shipName from request parameters
    try {
        const ship = await ShipModel.findOne({ shipName: shipName }); // Retrieve ship data by shipName
        if (!ship) {
            return res.status(404).json({ message: 'Ship not found' }); // Return 404 if ship is not found
        }
        res.json(ship); // Respond with the ship data as JSON
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' }); // Handle any errors
    }
});

app.post('/populate_data',async(req,res)=>{
    try {
       await processAndSaveData(filePath);
       res.status(400).json({ message: 'data was added successfully' }); 
    } catch (error) {
        throw new Error(error);
    }
})

// Connect to MongoDB (replace connection string)
mongoose.connect('mongodb+srv://be19b035:lR2sLiB1McGwD0sl@geoship.bgezxoa.mongodb.net/?retryWrites=true&w=majority&appName=Geoship', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>app.listen(8000,
()=> console.log(`app running on port : http://localhost:8000`)))
.catch(error => console.error('Error connecting to MongoDB:', error));






// Function to determine line style based on timestamp range
// function getLineStyle(endDate, timestamp) {
//     const twoDaysAgo = new Date(endDate);
//     twoDaysAgo.setDate(twoDaysAgo.getDate() - 2); // Calculate timestamp for 2 days before the end date
//     const sevenDaysAgo = new Date(endDate);
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // Calculate timestamp for 7 days before the end date

//     if (timestamp >= twoDaysAgo) {
//         return 'solid';
//     } else if (timestamp >= sevenDaysAgo) {
//         return 'dotted';
//     } else {
//         return 'dashed';
//     }
// }




// async function processAndSaveData(filePath) {
//     const ships = {}; // Object to store ship data with arrays of coordinates

//     // Read the CSV file and parse each row
//     fs.createReadStream(filePath)
//         .pipe(parse())
//         .on('data', row => {
//             const shipName = row.site_name;
//             const latitude = parseFloat(row.location_latitude);
//             const longitude = parseFloat(row.location_longitude);
//             const timestampString = row.ec_timestamp;

//             if (isNaN(latitude) || isNaN(longitude)) {
//                 console.warn(`Skipping entry for ${shipName} due to missing latitude or longitude.`);
//                 return; // Skip this entry if latitude or longitude is missing
//             }

//             const timestamp = new Date(Date.parse(timestampString));

//             const coordinates = convertToGeoJSON(latitude, longitude); // Convert coordinates to GeoJSON format

//             if (!ships[shipName]) {
//                 ships[shipName] = { route: { type: 'FeatureCollection', features: [] }, endDate: timestamp };
//             }

//             ships[shipName].route.features.push({
//                 type: 'Feature',
//                 geometry: coordinates,
//                 properties: {
//                     style: getLineStyle(ships[shipName].endDate, timestamp)
//                 }
//             });

//             // Update the end date if the current timestamp is later
//             if (timestamp > ships[shipName].endDate) {
//                 ships[shipName].endDate = timestamp;
//             }
//         })
//         .on('end', async () => {
//             // Reverse the order of features for each ship to restore chronological order
//             for (const shipName in ships) {
//                 ships[shipName].route.features.reverse();
//             }
//             try {
//                 await ShipModel.insertMany(ships);
//                 console.log('Ship data saved successfully to MongoDB');
//             } catch (error) {
//                 console.error('Error saving ship data to MongoDB:', error);
//             }
//         });
// }

async function processAndSaveDataPort(filePathPorts) {
    const ports = [];

    // Read the CSV file and parse each row
    fs.createReadStream(filePathPorts)
        .pipe(parse())
        .on('data', row => {
            const portName = row.port_name;
            const latitude = parseFloat(row.geo_location_latitude);
            const longitude = parseFloat(row.geo_location_longitude);

            // Skip if any required field is missing
            if (!portName || isNaN(latitude) || isNaN(longitude)) {
                console.warn(`Skipping entry due to missing data: ${JSON.stringify(row)}`);
                return;
            }

            // Create a new port object with GeoJSON format
            const port = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                properties: {
                    port_name: portName
                }
            };

            ports.push(port);
        })
        .on('end', async () => {
            // Create a FeatureCollection
            const featureCollection = {
                type: 'FeatureCollection',
                features: ports
            };

            // Save ports data to MongoDB
            try {
                await PortModel.create(featureCollection);
                console.log('Port data saved successfully to MongoDB');
            } catch (error) {
                console.error('Error saving port data to MongoDB:', error);
            }
        });
}

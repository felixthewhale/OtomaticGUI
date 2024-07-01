import * as d3 from 'd3';

import mappings from './command_mappings.js';
// connect websockets
import { io } from 'socket.io-client';
import {createInputContainer, InputVisualizer, pollGamepad} from './input.js';
import StatusIcon from './statusicon.js';

const serverUrl = 'http://localhost:5000';
const socket = io.connect('http://localhost:5000');

async function main() {

}
let disconnected = false; 
// ON DOM LOAD
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded!');
    // pollConsoleLog();
    main();
    console.log('Standard JS:', document.querySelector('div.inputcontainer'));
    console.log('D3:', d3.select('div.inputcontainer').node());
    
    let vis = new InputVisualizer('div.inputcontainer', 100, 100, 'L', sendSocketData);   
    // createInputContainer();
    pollGamepad(vis);

    // connect to websockets
    socket.on('connect', () => {
        console.log('Connected to server!');
        disconnected = false;
    });

    const status = 'OK'; // This could come from your state management logic
    const iconHTML = StatusIcon({ status });
    console.log(iconHTML);
    d3.select('.command-field').html(iconHTML);

    //
      // Start the gamepad polling loop
    // pollGamepad();
    const video = document.getElementById('videoStream');

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
        video.play();
      })
      .catch(err => {
        console.error('Error accessing webcam:', err);
      });

    // Using d3, select all buttons and play a sound on hover
    d3.selectAll('button')
    // The play method is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.

        .on('click', () => {
            const audio = new Audio('audio/button.mp3');
            audio.play();
        }
    );
    // #button1 on click - call function
    d3.select('#button1').on('click', onButton1click);
    d3.select('#button2').on('click', onButton2click);
    d3.select('#button_status').on('click', onButtonStatus);
});


async function onButton1click() {
    console.log('Button 1 clicked!');
    sendSocketData(6, 1, -1000);
}
async function onButton2click() {
    console.log('Button 2 clicked!');
    // sendData(6, 1, 0);
}



///////////////////////////////////////// GAMEPAD START /////////////////////////////////////////


  
///////////////////////////////////////// GAMEPAD END /////////////////////////////////////////


async function onButtonStatus() {
    let status = await getStatus();
    if (status == null) {
        console.log("Status is null");
        return;
    }
    console.log('Button Status clicked!', status);

    // Convert the JSON object to an array of label-value pairs
    let data = Object.entries(status).map(([key, value]) => {
        return { label: key + ":", value: value };
    });

    let divSelection = d3.select('.status-info').selectAll('div.status-item')
        .data(data);

    // For new data entries
    let newDivs = divSelection.enter().append('div')
        .attr('class', 'status-item');

    newDivs.append('span')
        .attr('class', 'status-label')
        .text(d => d.label);

    newDivs.append('span')
        .attr('class', 'status-value')
        // Round Max 2 decimal places (if number)
        .text(function(d) { return typeof d.value === 'number' ? Math.round(d.value * 100) / 100 : d.value; })

    // For updating existing entries
    divSelection.select('.status-label')
        .text(d => d.label);
    
    divSelection.select('.status-value')
        .text(function(d) { return typeof d.value === 'number' ? Math.round(d.value * 100) / 100 : d.value; })
}



/**
 * Send command, motor, and value details to the backend.
 * @param {number} command 
 * @param {number} motor 
 * @param {number} value 
 * @returns {Promise<Object>} - Returns a promise that resolves to the response data.
 */
// function sendData(command, motor, value) {
//     const fetchPromise = fetch(`${serverUrl}/send`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             command: command,
//             motor: motor,
//             value: value
//         })
//     });

//     return Promise.race([fetchPromise, timeout(200)])  //
//     .then(response => {
//         if (!response.ok) {
//             console.log("Error", response);
//             // Handle error as per your requirement
//         }
//         return response.json();
//     })
//     .catch(error => {
//         // Handle timeout or fetch error
//         throw new Error(error);
//     });
// }
function timeout(ms) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));
}
/**
 *  Send command, motor, value via socket
 */
function sendSocketData(command, motor, value) {
    socket.emit('send', {
        command: command,
        motor: motor,
        value: value
    });
}


function getStatus() {
    try {
    return fetch(`${serverUrl}/status`)
    .then(response => { if (!response.ok) {
        console.log("Error", response);
        // throw new Error('Network was not ok');
    } return response.json(); })
    .then(data => { if (data.data) { return data.data; } return null; });
    } catch (err) {
        console.log("Error", err);
    }

}


/**
 * Get console log data from the backend.
 * @returns {Promise<Object>} - Returns a promise that resolves to the response data.
 */
function getConsoleLog() {
    return fetch(`${serverUrl}/console`)
    .then(response => { if (!response.ok) { 
        disconnected = true;
        // throw new Error('Network response was not ok'); 
    } return response.json(); })
    .then(data => { disconnected = false; if (data.data) { return data.data; } return null; });
}
async function pollConsoleLog() {

    try {
        const data = await getConsoleLog();
        console.log("Tick", data);
        // Data is array of [timestamp, text]. Populate d3 #console-output with <div> <span>timestamp</span> <span>text</span> </div>
    
        d3.select('.console-output').selectAll('div')
            .data(data)
            .join('div')
            .html(d => {
                const date = new Date(d[0]*1000);
                return `<span>${date.toLocaleTimeString() }</span> <span>${d[1]}</span>`
            })
            .attr('class', 'consoleoutputitem');
        
            onButtonStatus();
    
    }
    catch (err) { disconnected = true;
    console.log("Error", err);
    showDisconnectedWarning(true);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    pollConsoleLog();
}



async function showDisconnectedWarning(bShow = true) {
    // Initialize the variable outside the function if not already done.
    // let disconnected = true;
    // Add an overlay at the center of the screen with text "Disconnected"
    let disconnected_overlay = d3.select('body').append('div')
        .attr('class', 'disconnected-overlay')
        .html('<span>Disconnected</span>');


        // Slow fade in to opacity 1, then wait 1 second
    disconnected_overlay
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1)
        // .delay(1000)
        // Then fade out to opacity 0
        .transition()
        .duration(500)
        .style('opacity', 0)




                .on('end', function() { 
                    //delete the overlay
                    d3.select(this).remove();
                });


}
/**
 * Fetch the received data from the backend.
 * @returns {Promise<Object>} - Returns a promise that resolves to the received data.
 */
function receiveData() {
    return fetch(`${serverUrl}/send`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.data) {
            return data.data;
        }
        return null;
    });
}








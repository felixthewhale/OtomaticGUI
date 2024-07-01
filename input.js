import * as d3 from 'd3';

class InputVisualizer {
  constructor(containerSelector, w, h, caption = "L", sendfunction = null)
  {
    this.sendfunction = sendfunction;
    this.w = w;
    this.h = h;
    this.svg = d3.select(containerSelector)
      .append("svg")
      .attr("width", w)
      .attr("height", h);
    console.log("CREATED SVG", this.svg);
    // Draw boundary square
    this.svg.append("rect")
      .attr("x", w / 10)
      .attr("y", h / 10)
      .attr("width", w - w / 5)
      .attr("height", h - h / 5)
      .style("stroke", "grey")
      .style("fill", "none")
      .style("stroke-width", 2);


    

    // Draw horizontal and vertical lines form w,h including up to w/10, h/10
    this.svg.append("line").attr("x1", w/2).attr("y1", h/10).attr("x2", w/2).attr("y2", h - h/10).style("stroke", "grey").style("stroke-width", 2);
    this.svg.append("line").attr("x1", w/10).attr("y1", h/2).attr("x2", w - w/10).attr("y2", h/2).style("stroke", "grey").style("stroke-width", 2);

    this.pointergroup = this.svg.append("g")
    // Create a circle initially at the center
    this.circle = this.pointergroup.append("circle")
      .attr("cx", w / 2)
      .attr("cy", h / 2)
      .attr("r", w / 10)
      .style("fill", "orange");
      console.log("CREATED CIRCLE", this.circle);

    // Create a caption
    this.pointergroup.append("text")
        .attr("x", w/2) // Set x position to center
        .attr("y", h/2) // Set y position to center
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("dy", ".3em")
        
        .attr("font-size", "15px")
        .attr("fill", "white")
        .text(caption);
  }

  updatePosition(x, y) {
    // Boundary square limits, assuming the square is 200x200
    const limit = this.w / 2 - this.w / 10;

    // Cap the x and y coordinates to the defined limit
    const cappedX = Math.max(-limit, Math.min(x, limit));
    const cappedY = Math.max(-limit, Math.min(y, limit));

    // Compute the final coordinates (centered at 100, 100)
    const finalX = this.w / 2 + cappedX;
    const finalY = this.h / 2 + cappedY;
    // Update with transition for smooth movement
    this.pointergroup
      .transition().duration(30)
      .attr("transform", `translate(${finalX - this.w/2}, ${finalY - this.h/2})`);
  }

  
}

var prevInput = [0, 0];
const INPUT_THRESHOLD = 0.02;

async function pollGamepad(visualizer) {
  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    const gamepad = gamepads[i];
    if (gamepad) {
        let x = gamepad.axes[0] * 100
        let y = gamepad.axes[1] * 100;
    
        // Apply Kalman filter
        const filteredX = kalmanFilterX.filter(x);
        const filteredY = kalmanFilterY.filter(y);
        // const filteredX = x;
        // const filteredY = y;
        // console.log("X: ", filteredX, "Y: ", filteredY);
    
        if (Math.abs(filteredX - prevInput[0]) > INPUT_THRESHOLD || Math.abs(filteredY - prevInput[1]) > INPUT_THRESHOLD) {
          visualizer.sendfunction(6, 0, Math.round(filteredX*50));
          visualizer.sendfunction(6, 1, Math.round(filteredY*5));
          console.log("X: ", filteredX, "Y: ", filteredY, "Prev", prevInput);
          visualizer.updatePosition(filteredX, filteredY);
          prevInput = [filteredX, filteredY];
        }
      }
  }
//   await new Promise(r => setTimeout(r, 100));
  // Continue polling
  requestAnimationFrame(() => pollGamepad(visualizer));

}

class KalmanFilter {
    constructor(R, Q, A, B, C) {
      this.R = R;  // process noise
      this.Q = Q;  // measurement noise
      this.A = A;  // state vector
      this.B = B;  // control vector
      this.C = C;  // output vector
  
      this.cov = NaN;
      this.x = NaN;  // estimated signal without noise
    }
  
    filter(measurement, control = 0) {
      if (isNaN(this.x)) {
        this.x = (1 / this.C) * measurement;
        this.cov = (1 / this.C) * this.Q * (1 / this.C);
      } else {
        const predX = (this.A * this.x) + (this.B * control);
        const predCov = ((this.A * this.cov) * this.A) + this.R;
  
        // Kalman gain
        const K = predCov * this.C * (1 / ((this.C * predCov * this.C) + this.Q));
  
        // Correction
        this.x = predX + K * (measurement - (this.C * predX));
        this.cov = predCov - (K * this.C * predCov);
      }
  
      return this.x;
    }
  }
  
// Initialize Kalman filter with R, Q, A, B, C
const kalmanFilterX = new KalmanFilter(0.2, 0.1, 1, 0, 1);
const kalmanFilterY = new KalmanFilter(0.2, 0.1, 1, 0, 1);

export { InputVisualizer, pollGamepad };

// Initialization
// pollGamepad();

// pdf417Utils.js

export const generatePDF417 = async (canvas, code) => {
    return new Promise((resolve, reject) => {
      // Check if PDF417 is already available, if not, load the scripts
      if (typeof window.PDF417 === 'undefined') {
        const script1 = document.createElement('script');
        script1.src = 'https://cdn.jsdelivr.net/gh/pkoretic/pdf417-generator@master/lib/libbcmath.js';
        script1.onload = () => {
          const script2 = document.createElement('script');
          script2.src = 'https://cdn.jsdelivr.net/gh/pkoretic/pdf417-generator@master/lib/bcmath.js';
          script2.onload = () => {
            const script3 = document.createElement('script');
            script3.src = 'https://cdn.jsdelivr.net/gh/pkoretic/pdf417-generator@master/lib/pdf417.js';
            script3.onload = () => {
              try {
                window.PDF417.draw(code, canvas);
                resolve();
              } catch (e) {
                reject(e);
              }
            };
            script3.onerror = reject;
            document.head.appendChild(script3);
          };
          script2.onerror = reject;
          document.head.appendChild(script2);
        };
        script1.onerror = reject;
        document.head.appendChild(script1);
      } else {
        try {
          window.PDF417.draw(code, canvas);
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });
  };
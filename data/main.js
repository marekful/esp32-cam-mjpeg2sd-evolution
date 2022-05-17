function setup() {
    $('input[type="range"]').on('input', function () {
      var control = $(this),
      controlMin = control.attr('min'),
      controlMax = control.attr('max'),
      controlVal = control.val();

      var range = controlMax - controlMin;
      var position = (controlVal - controlMin) / range * 30;
      
      var output = control.next('output');
      output.
      css('left', 'calc(' + position + '%)').text(controlVal);
    });

    $('nav.quick-nav').click(function() {
        let a = $($(this).data('target'));
        a.toggleClass('active');
        $('nav.panel').not($(this).data('target')).removeClass('active');
        a.find('.menu-action').prop('checked', true);

        $(this).siblings().removeClass('active');
        $(this).toggleClass('active');
        
        if (!$('nav.panel').hasClass('active')) {
          $(this).parent().addClass('menu-closed');
          $(this).parent().removeClass('menu-open');
        } else {
          $(this).parent().removeClass('menu-closed');
          $(this).parent().addClass('menu-open');
        }
    });

    $('.pin-menu').click(() => {
        pinned = $('.menu-pinned');
        floating = $('.menu-floating');
        if (pinned.length) {
            pinned.removeClass('menu-pinned');
            pinned.addClass('menu-floating');
        }
        if (floating.length) {
            floating.removeClass('menu-floating');
            floating.addClass('menu-pinned');
        }
    });

    var baseHost = document.location.origin;
    var streamUrl = baseHost + ':81';
    var timer = null;                  

    const updateValue = (el, value, updateRemote) => {
      updateRemote = updateRemote == null ? true : updateRemote
      el = el instanceof HTMLElement ? el : el[0];
      let initialValue
      if (el.type === 'checkbox') {
        initialValue = el.checked
        value = !!Number(value);
        el.checked = value
      } else if (el.type === 'range') {
          initialValue = el.value
          el.value = value          
          el.parentElement.children.rangeVal.value = value
      } else {
        if (el.classList.contains('displayonly')) {
          el.innerHTML = value       
        } else {
          initialValue = el.value
          el.value = value
        }
      }

      if (updateRemote && initialValue !== value) {
        updateConfig(el);
      } else if(!updateRemote){
        if(el.id === "aec"){
          value ? exposure.hide() : exposure.show()
        } else if(el.id === "agc"){
          if (value) {
            $(gainCeiling).show()
            agcGain.hide()
          } else {
            gainCeiling.hide()
            agcGain.show()
          }
        } else if(el.id === "forceRecord") { 
            if (value) {
              activateRecordButton();
            } else {
              deactivateRecordButton();
            }
        } else if (el.id === "forcePlayback") {

          if (value) {
            activatePlaybackButton();
            disableStreamButtons();
          } else {
            deactivatePlaybackButton();
            enableStreamButtons();
          }
        } else if(el.id === "forceStream") {
          if (value) {
            activateStreamButton();
          } else {
            deactivateStreamButton();
          }
        } else if(el.id === "clockUTC"){        
          var uClock = new Date(value.replace(" ","T"));
          var now = new Date();
          var nowUTC = now.getTime() + now.getTimezoneOffset() * 60000;
          var timeDiff = Math.abs(nowUTC - uClock.getTime());        
          console.log("Now: " + now.toISOString() + " browser: " + uClock.toISOString() + " Local time diff to browser: " + timeDiff/100 +" sec");
          if(timeDiff > 2000){ //2 sec
            now = new Date();
            var value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
            console.log("Sync to time: " + value );
            const query = `${baseHost}/control?clockUTC=${value}`
            fetch(query)
              .then(response => {
                console.log(`request to ${query} finished, status: ${response.status}`)
            })
          }      
        } else if(el.id === "fw_version"){    
          document.getElementById("fw_version").innerHTML = "ver: " + value;
        } else if(el.id === "hostName"){
          document.title = value;
          document.getElementById("page-title").innerHTML = value;
        } else if(el.id === "awb_gain"){
          value ? $(wb).show() : $(wb).hide()
        }
      }
    }
    
    function handleErrors(response) {
      if (!response.ok) {
        alert(response.statusText);
      }
      return response;
    }

    function updateConfig (el) {
      el = el instanceof HTMLElement ? el : el[0];
      let value
      switch (el.type) {
        case 'checkbox':
          value = el.checked ? 1 : 0
          break
        case 'range':
        case 'select-one':
          value = el.value
          break
        case 'button':
        case 'submit':
          if(el.value!="1"){ //Delete folder or file, or ftp upload or move
            value = el.value;        
          }else{
            value = '1'
          }
          break
        case 'text':
          value = el.value
          break
        default:
          return
      }
      if(el.id === "framesize"){ 
        r = el.options[el.selectedIndex].text.split('(')[1].replace(')','').split('x')
        srcSize = { width: parseInt(r[0]), height: parseInt(r[1]) } 
        if (encodeURI(fullScreen.html()) === '%C2%A4') 
          $("#stream-container").css("width", srcSize.width).css("height", srcSize.height );
      }
      const query = `${baseHost}/control?${el.id}=${value}`
      const encoded = encodeURI(query);
      //console.log(`Encoded request ${query}`)
      fetch(encoded)
        .then(handleErrors)
        .then(response => {
          console.log(`request to ${query} finished, status: ${response.status}`)
      })
    }

    document
      .querySelectorAll('.close')
      .forEach(el => {
        el.onclick = () => {
          $(el.parentNode).hide();
        }
      })
      
    refresh_status();
    if(timer == null){
      setTimeout(refresh_status_quick,5000);
    } 
    
    function refresh_status_quick() {
      // read initial values
      clearTimeout(timer);
      timer = null;
      fetch(`${baseHost}/status?q`)
        .then(function (response) {     
          return response.json()
        })
        .then(function (state) {
          document
            .querySelectorAll('#footer .default-action, #maintoolbar .default-action, #clockUTC')
            .forEach(el => {
              updateValue(el, state[el.id], false)
            })
            if(state['forceRecord'] && forceRecord.data('state-recording'))  updateValue(forceRecord, 1, false)
            else if(!state['forceRecord'] && !forceRecord.data('state-recording'))  updateValue(forceRecord, 0, false)
            timer = setTimeout(refresh_status_quick, 5000);
        })
        .catch((e) => {
          console.log('Error: ', e);
          timer = setTimeout(refresh_status_quick, 5000);
        });
    }


    function refresh_status() {
    // read initial values
    fetch(`${baseHost}/status`)
      .then(function (response) {
        return response.json()
      })
      .then(function (state) {
        document
          .querySelectorAll('.default-action')
          .forEach(el => {
            updateValue(el, state[el.id], false)
          })
      })
      .catch((e) => {
          console.error('Error: ', e);
        });
    }

    const view = $('#stream')
    const viewContainer = $('#stream-container')
    const configButton = $('#showConfig')
    const logButton = $('#showLog')
    const otaButton = $('#OTAupload')
    const forceRecord = $('#forceRecord')
    const recordingIndicator = $('#recording-indicator')
    const stillButton = $('#get-still')
    const streamButton = $('#forceStream')
    const playbackButton = $('#forcePlayback')
    const closeButton = $('#close-stream')  
    const fullScreen= $('#full-screen') 
    const uploadButton = $('#upload')    
    const uploadMoveButton = $('#uploadMove')    
    const downloadButton = $('#download') 
    const deleteButton = $('#delete') 
    const rebootButton = $('#reboot')
    const saveButton = $('#save')
    //const formatButton = $('#format')
    
    configButton.click(() => {
      window.location.href='/web?configs.txt';
    });
    logButton.click(() => {
      window.location.href='/web?LOG.htm';
    })
    otaButton.click(() => {
      window.location.href='/web?OTA.htm';
    });
    
    uploadButton.click(() => {
      updateConfig(uploadButton);
    });
    uploadMoveButton.click(() => {
      updateConfig(uploadMoveButton);
    });
    downloadButton.click(() => {
      var downloadBtVal = $('#download').val();    
      if (downloadBtVal != downloadBtVal.split('.')) window.location.href='/control?download=1';    
    });

    deleteButton.click(function() {
      if(!confirm("Are you sure you want to delete " + $(this).val() + " from the SD card?"))
        return false;
        
      updateConfig(deleteButton);
      
      var sid = $('#sfile');
      sid.find('option:not(:first)').remove(); // remove all except first option
      sid.append('<option id="del" value="/"List Folders</option>'); 
    });

    rebootButton.click(function() {
      stopStream();
      $.ajax({
        url: baseHost + '/control',
        data: {
          "reset" : "1"
        }
      })
      setTimeout(function () { location.reload(true); }, 10000);
    });
  
    saveButton.onclick = () => {
      const bPlaying = (streamButton.innerHTML == 'Stop Stream')
      if (bPlaying) {
        stopStream();
      }
      $.ajax({
        url: baseHost + '/control',
        data: {
          "save" : "1"
        },
        success: function(response) {
          if (bPlaying) startStream()
        }
      })
    }
    
    var srcSize = { width: 0, height: 0 };
    const stopStream = () => {
      const curSize = {width: view.width, height: view.height}
      window.stop();
      //Reset to view size
      $("#stream-container").css("width",curSize.width).css("height", curSize.height);
      $.ajax({
        url: baseHost + '/control',
        data: {
          "stopStream": "1"
        }
      }).then(() => {
        deactivateStreamButton();
      });
    }

    const stopPlayback = () => {
      const curSize = {width: view.width, height: view.height}
      window.stop();
      //Reset to view size
      $("#stream-container").css("width",curSize.width).css("height", curSize.height);
      deactivatePlaybackButton();
      enableStreamButtons();
      $.ajax({
        url: baseHost + '/control',
        data: {
          "stopStream": "1"
        }
      }).then(() => {
        deactivatePlaybackButton();
        viewContainer.hide();
      });
    }

    const startStream = () => {
      disableStreamButtons();
      activateStreamButton();
      view.attr('src', `${streamUrl}/stream?source=sensor`);
    }

    const activatePlaybackButton = () => {
      if (playbackButton.data('state-streaming-file')) return;
      playbackButton.data('state-streaming-file', true);
      playbackButton.html(playbackButton.data('label-active'));
      playbackButton.addClass("blinking");
    }
    
    const deactivatePlaybackButton = () => {
      if (!playbackButton.data('state-streaming-file')) return;
      playbackButton.data('state-streaming-file', false);
      playbackButton.html(playbackButton.data('label-inactive'));
      playbackButton.removeClass("blinking");
    }

    const activateRecordButton = () => {
      if (forceRecord.data('state-recording')) return;
      forceRecord.data('state-recording', true);
      forceRecord.addClass('button-red');
      forceRecord.html(forceRecord.data('label-active'));
      recordingIndicator.show();
      recordingIndicator.addClass("blinking");
    }
    
    const deactivateRecordButton = () => {
      if (!forceRecord.data('state-recording')) return;
      forceRecord.data('state-recording', false);
      forceRecord.removeClass('button-red');
      forceRecord.html(forceRecord.data('label-inactive'));
      recordingIndicator.removeClass("blinking");
      recordingIndicator.hide();
    }

    const activateStreamButton = () => {
      if (streamButton.data('state-streaming-live')) return;
      streamButton.data('state-streaming-live', true);
      streamButton.html(streamButton.data('label-active'));
      streamButton.addClass('blinking');
    }
    
    const deactivateStreamButton = () => {
      if (!streamButton.data('state-streaming-live')) return;
      streamButton.data('state-streaming-live', false);
      streamButton.html(streamButton.data('label-inactive'));
      streamButton.removeClass('blinking');
    }
    
    const startPlayback = () => {
      view.src = `${streamUrl}/stream?source=file`
      activatePlaybackButton()
      disableStreamButtons()
    }

    const disableStreamButtons = () => {
      stillButton.prop('disabled', true);
      streamButton.prop('disabled', true);
      forceRecord.prop('disabled', true);
    }
    
    const enableStreamButtons = () => {
      stillButton.prop('disabled', false);
      streamButton.prop('disabled', false);
      forceRecord.prop('disabled', false);
    }

    view.on('load', function() {
      console.log('view.onload > ');
      enableStreamButtons();
      srcSize = { width: view.width, height: view.height } 
      if(fullScreen.html() !== '#')
        $("#stream-container").css("width",srcSize.width).css("height", srcSize.height);
        viewContainer.show();
    });

    view.on('error', function() {
      console.log('view.onerror > ');
      //deactivateStreamButton();
    });

    view.on('abort', function() {
      console.log('view.onerror > ');
      //deactivateStreamButton();
    });

    forceRecord.click(function() {    
      var recOn = 0;
      if( !$(this).data('state-recording')) {
        activateRecordButton();
        forceRecord.prop('disabled', true);
        var recOn = 1;
      } else {
        deactivateRecordButton();
        var recOn = 0;
      }
      $.ajax({
        url: baseHost + '/control',
        data: {
          "forceRecord": recOn
        }
      }).then(function() {
        forceRecord.prop('disabled', false);
      })
    });

    stillButton.click(() => {
      stopStream();
      disableStreamButtons();
      view.attr('src', `${streamUrl}/stream?random=${Date.now()}`);
    });

    closeButton.click((e) => {
      stopStream()
      viewContainer.hide()
      e.stopPropagation();
      //Exit from full screen
      if(fullScreen.html() === '-' || fullScreen.html() === '#'){
        toggleFullScreen()
      }
    });

    streamButton.click(function() {
      const streamEnabled = $(this).data('state-streaming-live');
      console.log('streambtn click > ', streamEnabled, $(this).data());
      if (streamEnabled) {
        stopStream();
        viewContainer.hide();
      } else {
        startStream();
      }
    });
    
    playbackButton.click(() => {
      const streamEnabled = playbackButton.data('state-streaming-file');
      if (streamEnabled) {
        stopPlayback();
      } else {
        startPlayback();
      }
    });
    
    function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
      var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
      return { width: srcWidth*ratio, height: srcHeight*ratio };
    }
    
    //Resize player window,  #. Maximized - 2. Original - 3. Fullscreen aspect - 4. Fullscreen 
    function toggleFullScreen() {        
    if (fullScreen.html() === '#') { //Maximized -> Original 
        $("#stream-container").css("width", srcSize.width).css("height", srcSize.height);
        fullScreen.html('&curren;')
    } else if (encodeURI(fullScreen.html()) === '%C2%A4') { //Original -> Fullscreen aspect
        viewContainer[0].requestFullscreen()
        var r = calculateAspectRatioFit(srcSize.width, srcSize.height, window.screen.availWidth, window.screen.availHeight)
        $("#stream-container").css("width",r.width).css("height", r.height);
        $("#stream").css("width","100%").css("height","auto")
        fullScreen.html('&rect;')
    } else  if (encodeURI(fullScreen.html()) === '%E2%96%AD') { //Fullscreen aspect -> Fullscreen       
        $("#stream-container").css("width", window.screen.availWidth).css("height", window.screen.availHeight);
        $("#stream").css("width","100%").css("height","100%")
        fullScreen.html('-')
      } else { //Fullscreen -> Maximized
        document.exitFullscreen()
        $("#stream-container").css("width", "100%").css("height", "auto");
        fullScreen.html('#')
      }
    }

  //Maximize - Minimize video on click
    viewContainer.click(() => {
      toggleFullScreen()
    });
    //Maximize - Minimize on button click
    fullScreen.click((e) => {
      e.stopPropagation();
      console.log("fullScreen click")
      toggleFullScreen()
    });
    
    // Attach default on change action
    document
      .querySelectorAll('.default-action')
      .forEach(el => {
        el.onchange = () => updateConfig(el)
      })

    // Custom actions
    //Timezone selection
    const timezoneSel = document.getElementById('timezoneSel')
    timezoneSel.onchange = () => {
      var tz = document.getElementById('timezone');
      if(timezoneSel.options[timezoneSel.selectedIndex].value!=''){
        tz.value = timezoneSel.options[timezoneSel.selectedIndex].value;    
        updateConfig(tz)
      }
    }
    
    // Gain
    const agc = $('#agc');
    const agcGain = $('#agc_gain-group');
    const gainCeiling = $('#gainceiling-group');
    agc.change(function() {
      updateConfig(agc)
      if (agc.prop('checked')) {
        gainCeiling.show();
        agcGain.hide();
      } else {
        gainCeiling.hide();
        agcGain.show();
      }
    });

    // Exposure
    const aec = $('#aec');
    const exposure = $('#aec_value-group');
    aec.change(function() {
      updateConfig($(this))
      $(this).prop('checked') ? exposure.hide() : exposure.show()
    });

    // AWB
    const awb = $('#awb_gain');
    const wb = $('#wb_mode-group');
    awb.change(function() {
      updateConfig(awb)
      awb.prop('checked') ? wb.show() : wb.hide()
    });

    // Logging mode
    const logMode = $('#logMode');
    logMode.change(function() {
      var selection = logMode.value();
      if(selection == 2){      
        if(!confirm("Press ok and within 30 seconds go to remote host and type: telnet camera_ip 443")) {
          logMode.value(0);
          return false;
        }
      }
      $.ajax({
        url: baseHost + '/control',
        data: {
          "logMode": selection
        },   
        success: function(response) {
          console.log('Set debug mode', selection);
        }
      }); 
    });

    // framesize
    const framesize = $('#framesize');
    framesize.change(function() {
      updateConfig(framesize)
      updateFPS();
    });

    function updateFPS() {
      // update default FPS to match selected framesize 
      $.ajax({
        url: baseHost + '/control',
        data: {
          "updateFPS": $('#framesize').val()
        }, 
        success: function(response) {
          // update FPS
          $.each(response, function(key, value){
            $('#'+key).val(value); // fps
          });
        }
      }); 
    }

    // folder / file option list
    const sfile = document.getElementById('sfile');
    sfile.onchange = () => {
      // build option list from json
      var sid = $('#sfile');
      var selection = sid.val();    
      $("*").css("cursor", "wait");
      document.getElementById('download').value = selection; //Store file path for download
      document.getElementById('delete').value = selection; //Store file path for delete
      document.getElementById('upload').value = selection; //Store file path for ftp upload
      document.getElementById('uploadMove').value = selection; //Store file path for ftp upload move
      var listItems = '';
      //Not a file list
      var pathDir = selection.substring(0,selection.lastIndexOf("/"))
      if(pathDir=="") sid.find('option:not(:first)').remove(); // remove all except first option
      if(selection.substr(-4) === '.avi' && !recordingIndicator.data('state-recording')) playbackButton.prop("disabled", false);
      else playbackButton.prop("disabled", true);
      $.ajax({
        url: baseHost + '/control',
        data: {
          "sfile": selection
        },   
        success: function(response) {
          // create new option list from json
          $.each(response, function(key, value){
            listItems += '<option value="' + key + '">' + value + '</option>';
          });
          sid.append(listItems); // small bug - keeps appending Get Folders each time file selected in same folder
          $("*").css("cursor", "default");
        },
        error: function (xhr, ajaxOptions, thrownError) {
          $("*").css("cursor", "default");
          console.log(xhr.status);
        }         
      }); 
    }
  };
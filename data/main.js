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

    const hide = el => {
      el.classList.add('hidden')
    }
    const show = el => {
      el.classList.remove('hidden')
    }

    const disable = el => {
      el.classList.add('disabled')
      el.disabled = true
    }

    const enable = el => {
      el.classList.remove('disabled')
      el.disabled = false
    }

    const updateValue = (el, value, updateRemote) => {
      updateRemote = updateRemote == null ? true : updateRemote    
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
          value ? hide(exposure) : show(exposure)
        } else if(el.id === "agc"){
          if (value) {
            show(gainCeiling)
            hide(agcGain)
          } else {
            hide(gainCeiling)
            show(agcGain)
          }
        } else if(el.id === "forceRecord"){ 
            if(value){
              forceRecord.innerHTML='Stop Recording';
              recordingIndicator.style.display = 'block';
              recordingIndicator.classList.add("blinking");
              forceRecord.classList.add('button-red');
            }else{
              forceRecord.innerHTML='Record';
              recordingIndicator.style.display = 'none';     
              recordingIndicator.classList.remove("blinking");
              forceRecord.classList.remove('button-red')
            }
        } else if(el.id === "forcePlayback") {
          console.log(" > > stopPlayback > ", value);
          if (value) {
            playbackButton.innerHTML = 'Stop Playback';
            playbackButton.classList.add("blinking");
            disableStreamButtons()
          } else {
            playbackButton.innerHTML = 'Start Playback';
            playbackButton.classList.remove("blinking");
            enableStreamButtons()
          }
        } else if(el.id === "forceStream") {
          console.log(" > > stopSteam > ", value);
          if (value) {
            streamButton.innerHTML = 'Stop Stream';
            streamButton.classList.add("blinking");
          } else {
            streamButton.innerHTML = 'Start Stream';
            streamButton.classList.remove("blinking");
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
          value ? show(wb) : hide(wb)
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
        if (encodeURI(fullScreen.innerHTML) === '%C2%A4') 
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
          hide(el.parentNode)
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
            console.log(" >> state > ", state, forceRecord, streamButton);
            if(state['forceRecord'] && forceRecord.innerHTML=='Record')  updateValue(forceRecord, 1, false)
            else if(!state['forceRecord'] && forceRecord.innerHTML=='Stop Recording')  updateValue(forceRecord, 0, false)
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

    const view = document.getElementById('stream')
    const viewContainer = document.getElementById('stream-container')
    const configButton = document.getElementById('showConfig')
    const logButton = document.getElementById('showLog')
    const otaButton = document.getElementById('OTAupload')
    const forceRecord = document.getElementById('forceRecord')
    const recordingIndicator = document.getElementById('recording-indicator')
    const stillButton = document.getElementById('get-still')
    const streamButton = document.getElementById('forceStream')
    const playbackButton = document.getElementById('forcePlayback')
    const closeButton = document.getElementById('close-stream')  
    const fullScreen= document.getElementById('full-screen') 
    const uploadButton = document.getElementById('upload')    
    const uploadMoveButton = document.getElementById('uploadMove')    
    const downloadButton = document.getElementById('download') 
    const deleteButton = document.getElementById('delete') 
    const rebootButton = document.getElementById('reboot')
    const saveButton = document.getElementById('save')
    //const formatButton = document.getElementById('format')
    
    configButton.onclick = () => {
      window.location.href='/web?configs.txt';
    }
    logButton.onclick = () => {
      window.location.href='/web?LOG.htm';
    }
    otaButton.onclick = () => {
      window.location.href='/web?OTA.htm';
    }
    
    uploadButton.onclick = () => {
      updateConfig(uploadButton);
    }
    uploadMoveButton.onclick = () => {
      updateConfig(uploadMoveButton);
    }  
    downloadButton.onclick = () => {
      var downloadBtVal = $('#download').val();    
      if (downloadBtVal != downloadBtVal.split('.')) window.location.href='/control?download=1';    
    }

    deleteButton.onclick = () => {
      var deleteBt = $('#delete');
      if(!confirm("Are you sure you want to delete " + deleteBt.val() + " from the SD card?"))
        return false;
        
      updateConfig(deleteButton);
      
      var sid = $('#sfile');
      sid.find('option:not(:first)').remove(); // remove all except first option
      sid.append('<option id="del" value="/">Get Folders</option>'); 
    }

    rebootButton.onclick = () => {
      stopStream();
      $.ajax({
        url: baseHost + '/control',
        data: {
          "reset" : "1"
        }
      })
      setTimeout(function () { location.reload(true); }, 10000);
    }
  
  saveButton.onclick = () => {
      const bPlaying = (streamButton.innerHTML == 'Stop Stream')
      if(bPlaying){
        stopStream();
      }
      $.ajax({
        url: baseHost + '/control',
        data: {
          "save" : "1"
        },
        success: function(response) {
          if(bPlaying) startStream()
        }
      })
    }
    
    var srcSize = { width: 0, height: 0 };
    const stopStream = () => {
      const curSize = {width: view.width, height: view.height}
      window.stop();
      //Reset to view size
      $("#stream-container").css("width",curSize.width).css("height", curSize.height);
      streamButton.innerHTML = 'Start Stream'
      streamButton.classList.remove("blinking")
      $.ajax({
        url: baseHost + '/control',
        data: {
          "stopStream": "1"
        }
      })
    }

    const stopPlayback = () => {
      const curSize = {width: view.width, height: view.height}
      window.stop();
      //Reset to view size
      $("#stream-container").css("width",curSize.width).css("height", curSize.height);
      playbackButton.innerHTML = 'Start Playback'
      playbackButton.classList.remove("blinking")
      enableStreamButtons()
      $.ajax({
        url: baseHost + '/control',
        data: {
          "stopStream": "1"
        }
      })
    }

    const startStream = () => {
      view.src = `${streamUrl}/stream?source=sensor`
      streamButton.innerHTML = 'Stop Stream'
      streamButton.classList.add("blinking")
    }

    const activatePlaybackButton = () => {
      playbackButton.innerHTML = 'Stop Playback'
      playbackButton.classList.add("blinking")
    }
    
    const deactivatePlaybackButton = () => {
      playbackButton.innerHTML = 'Playback'
      playbackButton.classList.remove("blinking")
    }
    
    const startPlayback = () => {
      view.src = `${streamUrl}/stream?source=file`
      activatePlaybackButton()
      disableStreamButtons()
    }

    const disableStreamButtons = () => {
      stillButton.setAttribute("disabled", "disabled")
      streamButton.setAttribute("disabled", "disabled")
      forceRecord.setAttribute("disabled", "disabled")
    }
    
    const enableStreamButtons = () => {
      stillButton.removeAttribute("disabled")
      streamButton.removeAttribute("disabled")
      forceRecord.removeAttribute("disabled")
    }
    
    view.onload = function () {  	
      srcSize = { width: view.width, height: view.height } 
      if(fullScreen.innerHTML !== '#')
        $("#stream-container").css("width",srcSize.width).css("height", srcSize.height);
      show(viewContainer)    
    };

    forceRecord.onclick = () => {    
      var recOn = 0;
      if(forceRecord.innerHTML == 'Record'){
        recordingIndicator.style.display = 'block'
        recordingIndicator.classList.add("blinking")
        forceRecord.classList.add('button-red')
        forceRecord.innerHTML='Stop Recording'
        var recOn = 1;
      }else{
        recordingIndicator.classList.remove("blinking")
        recordingIndicator.style.display = 'none'
        forceRecord.classList.remove('button-red')
        forceRecord.innerHTML='Record'
        var recOn = 0;
      }
      $.ajax({
        url: baseHost + '/control',
        data: {
          "forceRecord": recOn
        }
      })
    }  

    stillButton.onclick = () => {
      stopStream()
      view.src = `${streamUrl}/stream?random=${Date.now()}`
      show(viewContainer)
    }
    closeButton.onclick = (e) => {
      stopStream()
      hide(viewContainer)
      e.stopPropagation();
      //Exit from full screen
      if(fullScreen.innerHTML === '-' || fullScreen.innerHTML === '#'){
        toggleFullScreen()
      }
    }

    streamButton.onclick = () => {
      const streamEnabled = streamButton.innerHTML === 'Stop Stream'
      if (streamEnabled) {
        stopStream()
      } else {
        startStream()
      }
    }
    
    playbackButton.onclick = () => {
      const streamEnabled = playbackButton.innerHTML === 'Stop Playback'
      if (streamEnabled) {
        stopPlayback()
      } else {
        startPlayback()
      }
    }
    
    function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
      var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
      return { width: srcWidth*ratio, height: srcHeight*ratio };
    }
    
    //Resize player window,  #. Maximized - 2. Original - 3. Fullscreen aspect - 4. Fullscreen 
    function toggleFullScreen() {        
    if (fullScreen.innerHTML === '#') { //Maximized -> Original 
        $("#stream-container").css("width", srcSize.width).css("height", srcSize.height);
        fullScreen.innerHTML = '&curren;'
    } else if (encodeURI(fullScreen.innerHTML) === '%C2%A4') { //Original -> Fullscreen aspect
        viewContainer.requestFullscreen()
        var r = calculateAspectRatioFit(srcSize.width, srcSize.height, window.screen.availWidth, window.screen.availHeight)
        $("#stream-container").css("width",r.width).css("height", r.height);
        $("#stream").css("width","100%").css("height","auto")
        fullScreen.innerHTML = '&rect;'
    } else  if (encodeURI(fullScreen.innerHTML) === '%E2%96%AD') { //Fullscreen aspect -> Fullscreen       
        $("#stream-container").css("width", window.screen.availWidth).css("height", window.screen.availHeight);
        $("#stream").css("width","100%").css("height","100%")
        fullScreen.innerHTML = '-'
      } else { //Fullscreen -> Maximized
        document.exitFullscreen()
        $("#stream-container").css("width", "100%").css("height", "auto");
        fullScreen.innerHTML = '#'
      }
    }

  //Maximize - Minimize video on click
    viewContainer.onclick = () => {
      toggleFullScreen()
    }
    //Maximize - Minimize on button click
    fullScreen.onclick = (e) => {
      e.stopPropagation();
      console.log("fullScreen click")
      toggleFullScreen()
    }
    
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
    const agc = document.getElementById('agc')
    const agcGain = document.getElementById('agc_gain-group')
    const gainCeiling = document.getElementById('gainceiling-group')
    agc.onchange = () => {
      updateConfig(agc)
      if (agc.checked) {
        show(gainCeiling)
        hide(agcGain)
      } else {
        hide(gainCeiling)
        show(agcGain)
      }
    }

    // Exposure
    const aec = document.getElementById('aec')
    const exposure = document.getElementById('aec_value-group')
    aec.onchange = () => {
      updateConfig(aec)
      aec.checked ? hide(exposure) : show(exposure)
    }

    // AWB
    const awb = document.getElementById('awb_gain')
    const wb = document.getElementById('wb_mode-group')
    awb.onchange = () => {
      updateConfig(awb)
      awb.checked ? show(wb) : hide(wb)
    }

    // Logging mode
    const logMode = document.getElementById('logMode')
    logMode.onchange = () => {   
      var selection = logMode.value;
      if(selection==2){      
        if(!confirm("Press ok and within 30 seconds go to remote host and type: telnet camera_ip 443")) {
          logMode.value=0;
          return false;
        }
      }
      $.ajax({
        url: baseHost + '/control',
        data: {
          "logMode": selection
        },   
        success: function(response) {
          console.log('Set debug mode',selection);
        }
      }); 
    }

    // framesize
    const framesize = document.getElementById('framesize')
    framesize.onchange = () => {
      updateConfig(framesize)
      updateFPS()
    }

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
      if(selection.substr(-4) === '.avi') playbackButton.removeAttribute("disabled");
      else playbackButton.setAttribute("disabled", "disabled");
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
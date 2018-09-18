angular.module('viaggia.services.notification', [])


  //
  //A Service to work with notifications with server
  //
  .factory('notificationService', function ($q, $http, $rootScope, LoginService,$ionicPlatform, Config) {

    var notificationService = {};
    var numberNotification = 10;
    var registrationId=null;
    notificationService.getNotifications = function (sinceTimestamp, sincePosition, numberNotification) {
      var deferred = $q.defer();
      $http.get(Config.getMessagingServerURL() + '/app/public/notification/' + Config.getMessagingAppId() +
        '/?since=' + sinceTimestamp +
        '&position=' + sincePosition +
        '&count=' + numberNotification, Config.getHTTPConfig())
        .success(function (data) {
          deferred.resolve(data.notifications);
        })
        .error(function (err) {
          deferred.reject(err);

        });
      return deferred.promise;
    }

    //register user to user notification
    notificationService.registerUser = function () {
      var deferred = $q.defer();
      LoginService.getValidAACtoken().then(
        function (token) {
      $http({
        method: 'POST',
        url: Config.getMessagingServerURL() + '/register/user/' + Config.getMessagingAppId(),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token

        },
        data: {
          "appName": Config.getMessagingAppId(),
          "registrationId": registrationId,
          "platform": ionic.Platform.isAndroid() ? "android" : "ios"
        },
        timeout: 5000
      }).success(function (data) {
        deferred.resolve(data.notifications);
      })
        .error(function (err) {
          deferred.reject(err);

        })},
        function () {
            deferred.reject();
        });
      return deferred.promise;
    }
    // Register to GCM
    notificationService.register = function () {
      console.log("registration")
      var push = PushNotification.init({
        android: {
          senderID: Config.getSenderID(),
          topics: [Config.getMessagingAppId() + ".android"],
          icon: "notification",
          iconColor: "gray"
        },
        ios: {
          alert: "true",
          badge: "true",
          sound: "true",
          senderID: Config.getSenderID(),
          // gcmSandbox: true,
          // fcmSandbox: true,
          topics: [Config.getMessagingAppId() + ".ios"]
        },
        windows: {}
      });

      push.on('registration', function (data) {
        //alert('registration' + JSON.stringify(data));
        console.log('registration' + JSON.stringify(data));
        registrationId = data.registrationId;


      });
      //What to do when I get a notification
      push.on('notification', function (data) {
        //alert("notification" + JSON.stringify(data));
        console.log("notification" + JSON.stringify(data));
        var lastTimeUpdate = new Date(localStorage.getItem(Config.getAppId() + '_lastUpdateTime'));
        console.log('received');
        $rootScope.countNotification = $rootScope.countNotification + 1;
        //alert("number of notification" + JSON.stringify($rootScope.countNotification));
        updateNotifications(lastTimeUpdate);
      });


      //...and in case of erro
      push.on('error', function (e) {
        //            alert('error' + e.message);
        console.log('error' + e.message)

      });




    }

    var getNotificationDetail = function () { }

    //get the last notification since last update
    var updateNotifications = function (lastTimeUpdate) {
      $http.get(Config.getMessagingServerURL() + '/app/public/notification/' + Config.getMessagingAppId() +
        '/?since=' + lastTimeUpdate.getTime() +
        '&position=' + 0 +
        '&count=' + numberNotification, Config.getHTTPConfig())
        .success(function (data) {
          if (data.notifications) {
            var lastUpdateTime = new Date(data.notifications[0].updateTime);
            localStorage.setItem(Config.getAppId() + '_lastUpdateTime', lastUpdateTime);
            //update the local notifications and not readed index
            localStorage.setItem(Config.getAppId() + '_notifications', JSON.stringify(data.notifications));
          }
          console.log('updated');
        })
        .error(function (err) {


        });
    }
    return notificationService;
  })

  .factory('feedService', function ($q, $rootScope, $http) {
    var cache = [];

    var load = function (url, feedKey, forceLoad) {
      var deferred = $q.defer();

      var oldTimestamp = localStorage['timestamp_' + feedKey];
      if (!forceLoad && oldTimestamp && new Date().getTime() - 10 * 60 * 1000 < oldTimestamp) {
        if (cache.length > 0) deferred.resolve(cache);
        else {
          deferred.resolve(cache = JSON.parse(localStorage['entries_' + feedKey]));
        }
      } else {
        $http.get(url).then(function (page) {
          //download and parse the new feeds
          var x2js = new X2JS();
          var jsonObj = x2js.xml_str2json(page.data);
          if (jsonObj && jsonObj.rss && jsonObj.rss.channel && jsonObj.rss.channel.item) {
            var res = jsonObj.rss.channel.item;
            localStorage['entries_' + feedKey] = JSON.stringify(res);
            localStorage['timestamp_' + feedKey] = new Date().getTime();
            cache = res;
            deferred.resolve(res);
          } else {
            deferred.reject();
          }
        }, function (err) {
          deferred.reject();
        });
      }

      return deferred.promise;
    };

    var getByIdx = function (idx, url, feedKey) {
      var deferred = $q.defer();
      load(url, feedKey).then(function (data) {
        if (data.length > idx) deferred.resolve(data[idx]);
        return null;
      });
      return deferred.promise;
    };

    return {
      load: load,
      getByIdx: getByIdx
    }
  });

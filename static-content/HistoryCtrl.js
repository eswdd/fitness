/*
 * Responsible for the main app, providing config and model<-> hash
 * functionality for the other controllers
 */
fitness
    .controller('HistoryCtrl', [ '$rootScope', '$scope', '$http', function HistoryCtrl($rootScope, $scope, $http) {
        $scope.recentWorkouts = [];
        $scope.status = "";

        $scope.loadRecentWorkouts = function() {
            $http.get('/api/workout/all').success(function(json) {
                json.sort($scope.workoutCompare);
                $scope.recentWorkouts = json;
            }).error(function(json,responseCode,headers,config) {
                    $scope.status = "Error loading workout history: "+JSON.stringify(json);
                });
        };

        $scope.workoutCompare = function(a,b) {
            var ma = moment(a.date, 'YYYY/MM/DD');
            var mb = moment(b.date, 'YYYY/MM/DD');
            var ret = ma.unix() - mb.unix();
            if (ret == 0) {
                ret = a.id - b.id;
            }
            return ret < 0 ? -1 : ret > 0 ? 1 : 0;
        };
        
        $scope.addWorkout = function() {
            $rootScope.showPage("workout");
        };
        
        $scope.editWorkout = function(id) {
            $rootScope.showPage("workout/"+id);
        };



        $scope.loadRecentWorkouts();
    }])
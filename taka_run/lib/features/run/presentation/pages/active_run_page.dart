import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../injection_container.dart';
import '../../../../core/models/gps_point.dart';
import '../bloc/run_bloc.dart';

class ActiveRunPage extends StatelessWidget {
  const ActiveRunPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<RunBloc>(),
      child: const _ActiveRunView(),
    );
  }
}

class _ActiveRunView extends StatefulWidget {
  const _ActiveRunView();

  @override
  State<_ActiveRunView> createState() => _ActiveRunViewState();
}

class _ActiveRunViewState extends State<_ActiveRunView> {
  GoogleMapController? _mapController;

  String _formatDuration(int seconds) {
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    if (h > 0) return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  List<LatLng> _toLatLngs(List<GpsPoint> points) {
    return points.map((p) => LatLng(p.lat, p.lng)).toList();
  }

  LatLngBounds? _getBounds(List<LatLng> points) {
    if (points.isEmpty) return null;
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;
    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  Widget _buildMap(List<GpsPoint> gpsPoints, {bool interactive = false}) {
    final latLngs = _toLatLngs(gpsPoints);
    if (latLngs.isEmpty) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: const Color(0xFF2C2C2C),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Center(
          child: Text('Waiting for GPS...', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    final lastPoint = latLngs.last;

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: interactive ? 300 : 200,
        child: GoogleMap(
          initialCameraPosition: CameraPosition(target: lastPoint, zoom: 16),
          polylines: {
            Polyline(
              polylineId: const PolylineId('route'),
              points: latLngs,
              color: const Color(0xFF00C853),
              width: 4,
            ),
          },
          markers: {
            if (latLngs.isNotEmpty)
              Marker(
                markerId: const MarkerId('start'),
                position: latLngs.first,
                icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
              ),
            Marker(
              markerId: const MarkerId('current'),
              position: lastPoint,
              icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
            ),
          },
          myLocationEnabled: false,
          zoomControlsEnabled: false,
          scrollGesturesEnabled: interactive,
          rotateGesturesEnabled: interactive,
          tiltGesturesEnabled: false,
          mapToolbarEnabled: false,
          liteModeEnabled: !interactive,
          onMapCreated: (controller) {
            _mapController = controller;
            if (latLngs.length > 1) {
              final bounds = _getBounds(latLngs);
              if (bounds != null) {
                controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, 48));
              }
            }
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Run'),
        leading: BlocBuilder<RunBloc, RunState>(
          builder: (context, state) {
            if (state is RunIdle || state is RunCompleted || state is RunError) {
              return IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.pop(context),
              );
            }
            return const SizedBox();
          },
        ),
      ),
      body: BlocConsumer<RunBloc, RunState>(
        listener: (context, state) {
          if (state is RunCompleted) {
            final result = state.result;
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (_) => AlertDialog(
                title: Text(result.validated ? 'Run Complete!' : 'Run Rejected'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (result.validated) ...[
                      const Icon(Icons.celebration, size: 48, color: Color(0xFF00C853)),
                      const SizedBox(height: 16),
                      Text(
                        '+${result.tkEarned.toStringAsFixed(2)} TK',
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF00C853)),
                      ),
                    ] else ...[
                      const Icon(Icons.warning, size: 48, color: Colors.orange),
                      const SizedBox(height: 16),
                      Text(result.errors.join('\n')),
                    ],
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.pop(context);
                    },
                    child: const Text('OK'),
                  ),
                ],
              ),
            );
          }
          if (state is RunError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
          // Auto-follow the runner on map
          if (state is RunActive && state.gpsPoints.isNotEmpty && _mapController != null) {
            final last = state.gpsPoints.last;
            _mapController!.animateCamera(
              CameraUpdate.newLatLng(LatLng(last.lat, last.lng)),
            );
          }
        },
        builder: (context, state) {
          if (state is RunIdle || state is RunPermissionNeeded) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.directions_run, size: 100, color: Color(0xFF00C853)),
                  const SizedBox(height: 32),
                  if (state is RunPermissionNeeded) ...[
                    const Text('Location permission required', style: TextStyle(color: Colors.orange)),
                    const SizedBox(height: 16),
                  ],
                  SizedBox(
                    width: 200,
                    height: 200,
                    child: ElevatedButton(
                      onPressed: () => context.read<RunBloc>().add(StartRun()),
                      style: ElevatedButton.styleFrom(shape: const CircleBorder()),
                      child: const Text('START', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          }

          if (state is RunActive) {
            return _buildRunningUI(context, state);
          }

          if (state is RunSummary) {
            return _buildSummaryUI(context, state);
          }

          if (state is RunSubmitting) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Submitting run...'),
                ],
              ),
            );
          }

          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildRunningUI(BuildContext context, RunActive state) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Map
          _buildMap(state.gpsPoints),
          const SizedBox(height: 24),
          // Distance
          Text(
            state.distance.toStringAsFixed(2),
            style: const TextStyle(fontSize: 64, fontWeight: FontWeight.bold, color: Color(0xFF00C853)),
          ),
          const Text('km', style: TextStyle(fontSize: 20, color: Colors.grey)),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _statColumn('Duration', _formatDuration(state.duration)),
              _statColumn('Pace', state.pace > 0 ? '${state.pace.toStringAsFixed(1)} min/km' : '--'),
              _statColumn('Points', '${state.gpsPoints.length}'),
            ],
          ),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              if (!state.isPaused)
                FloatingActionButton(
                  heroTag: 'pause',
                  onPressed: () => context.read<RunBloc>().add(PauseRun()),
                  backgroundColor: Colors.orange,
                  child: const Icon(Icons.pause, size: 32),
                )
              else
                FloatingActionButton(
                  heroTag: 'resume',
                  onPressed: () => context.read<RunBloc>().add(ResumeRun()),
                  backgroundColor: const Color(0xFF00C853),
                  child: const Icon(Icons.play_arrow, size: 32),
                ),
              FloatingActionButton.large(
                heroTag: 'stop',
                onPressed: () => context.read<RunBloc>().add(StopRun()),
                backgroundColor: Colors.red,
                child: const Icon(Icons.stop, size: 40),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSummaryUI(BuildContext context, RunSummary state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Text('Run Summary', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          // Route map
          _buildMap(state.gpsPoints, interactive: true),
          const SizedBox(height: 24),
          Text(
            '${state.distance.toStringAsFixed(2)} km',
            style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Color(0xFF00C853)),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _statColumn('Duration', _formatDuration(state.duration)),
              _statColumn('Pace', '${state.pace.toStringAsFixed(1)} min/km'),
            ],
          ),
          const SizedBox(height: 48),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.read<RunBloc>().add(SubmitRun()),
              child: const Text('Save & Earn TK', style: TextStyle(fontSize: 18)),
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => context.read<RunBloc>().add(DiscardRun()),
            child: const Text('Discard', style: TextStyle(color: Colors.grey)),
          ),
        ],
      ),
    );
  }

  Widget _statColumn(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
      ],
    );
  }
}
